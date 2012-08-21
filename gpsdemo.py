#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import logging
import time
import sqlite3
from urllib import urlencode

from recaptcha.client import captcha
from IPy import IP

import tornado.httpserver
import tornado.ioloop
import tornado.web
from tornado.escape import json_encode, json_decode
from tornado.options import define, options
define('db', default="gps.db")
define('port', type=int, default=10000)
define('mode', default="deploy")

_RECAPTCHA_PRIVATE_KEY = "6LebMNASAAAAAKyGlK0qhoRAOr8wo2I5-lJ3-fnZ"

def _verify_recaptcha(challenge, response, remoteip):
    response = captcha.submit(challenge,
                              response,
                              _RECAPTCHA_PRIVATE_KEY,
                              remoteip)
    return response.is_valid


class DBConnection(object):
    def __init__(self, db_file):
        self.conn = sqlite3.connect(db_file, isolation_level=None)
        self.cursor = self.conn.cursor()

    def close():
        try:
            self.cursor.close()
            self.conn.close()
            logging.info("db closed.")
        except:
            logging.exception("db close error.")

    def __del__(self):
        self.close()


class Application(tornado.web.Application):

    def __init__(self, debug=False):
        handlers = [
            (r"/test", TestHandler),
            (r"/gps", GPSHandler),
            (r"/track/([0-9]*)/([0-9]*)", TrackHandler),
            (r"/gpsdebug", GPSDebugHandler),
            (r"/login", LoginHandler),
            (r"/logout", LogoutHandler),
            (r"/", MainHandler),
        ]

        settings = dict(
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            cookie_secret="s8g1gVxKOiQoZptLRi2nSuXmiK2ThYJJBSHIUHnqoUw=",
            login_url="/login",
            debug=debug,
        )

        tornado.web.Application.__init__(self, handlers, **settings)
        self.db = DBConnection(options.db)
        # dict(mobile=dict(seq, freq, last, fixes))
        self.mobile_info = dict()

    def clean(self):
        self.db.close()

    def __del__(self):
        self.clean()

    def cleanup_mobile_info(self):
        logging.warn("cleaning mobile_info...")
        current = int(time.time())
        for k, v in self.mobile_info.items():
            if (v["last"] - current > DEBUG_FIXES_TIMEOUT):
                del self.mobile_info[k]
        logging.warn("mobile_info: %s", self.mobile_info)


class BaseHandler(tornado.web.RequestHandler):
    @property
    def db(self):
        return self.application.db.cursor

    @property
    def mobile_info(self):
        return self.application.mobile_info

    def get_current_user(self):
        return self.get_secure_cookie("mobile")


class LoginHandler(BaseHandler):
    def get(self):
        is_public = IP(self.request.remote_ip).iptype() == "PUBLIC"
        self.render("login.html", is_public=is_public)

    def post(self):
        mobile = self.get_argument("mobile", None)
        dest = "/"
        if mobile:
            is_public = IP(self.request.remote_ip).iptype() == "PUBLIC"
            challenge = self.get_argument("recaptcha_challenge_field", None)
            response = self.get_argument("recaptcha_response_field", None)
            if is_public and not _verify_recaptcha(challenge, response, self.request.remote_ip):
                self.redirect(dest)
                return
            self.set_secure_cookie("mobile", mobile)

        ischina = self.get_argument("ischina", "").upper() == "Y"
        if ischina:
            # use baidu map
            dest = "/?t=b"

        self.redirect(dest)


class LogoutHandler(BaseHandler):
    def get(self):
        self.clear_cookie("mobile")
        self.redirect("/")


class MainHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        mobile = self.current_user
        map_type = "bmap.html" if self.get_argument("t", None) == "b" else "map.html"
        current = int(time.time())
        delta = 24 * 60 * 60
        start = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(current - delta))
        end = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(current + delta))
        self.db.execute("SELECT * from gps WHERE mobile=?"
                        "  AND timestamp BETWEEN ? AND ?"
                        "  ORDER BY timestamp",
                        (mobile, start, end))
        fixes = self.db.fetchall()
        self.render(map_type, fixes=fixes, mobile=mobile)


def _format_timestamp(ts):
    """Format YYYYmmddHHMMSS to YYYY-mm-dd HH:MM:SS
    """
    return time.strftime("%Y-%m-%d %H:%M:%S", time.strptime(ts, "%Y%m%d%H%M%S"))


class TrackHandler(BaseHandler):

    @tornado.web.authenticated
    def get(self, start, end):
        mobile = self.current_user
        start, end = _format_timestamp(start), _format_timestamp(end)
        self.db.execute("SELECT * from gps WHERE mobile=?"
                        "  AND timestamp BETWEEN ? AND ?"
                        "  ORDER BY timestamp",
                        (mobile, start, end))
        fixes = json_encode({"fixes": self.db.fetchall()})
        self.write(fixes)


class GPSHandler(BaseHandler):
    def _work(self):
        record = [self.get_argument("mobile", None),
                  self.get_argument("lat", None),
                  self.get_argument("lon", None),
                  self.get_argument("timestamp", None)]
        if not all(record):
            raise tornado.web.HTTPError(400)

        if (len(record[-1]) != 14):
            raise tornado.web.HTTPError(400)
        try:
            record[-1] = _format_timestamp(record[-1])
        except:
            raise tornado.web.HTTPError(400)

        self.db.execute("INSERT INTO gps VALUES(?,?,?,?)",
                        record)
        self.write("OK")
        
    def post(self):
        self._work()


class GPSDebugHandler(BaseHandler):
    """Show debugging information from the terminal.

    The information will not be saved in the db.
    """

    @tornado.web.authenticated
    def get(self):
        """Retrieve current debug info in the server from the web.

        This function also updates `seq' and `freq'.
        """
        res = []
        if self.current_user in self.mobile_info:
            seq = int(self.get_argument("seq", 1))
            freq = int(self.get_argument("freq", 5))
            # remove unmatched fixes
            res = [t for t in self.mobile_info[self.current_user]["fixes"]
                     if t["seq"] == seq]

            self.mobile_info[self.current_user].update(seq=seq,
                                                       freq=freq,
                                                       last=int(time.time()),
                                                       fixes=[])
        # TODO: this is bad, should use comet.
        self.write(json_encode(dict(res=res)))

    def post(self):
        """Collect data from the terminal.

        format:
        mobile=xxxxx&lat=xxx.xxxx&lon=xxxx.xxxx&dop=xxx&timestamp=YYYYmmddHHMMSS&seq=xxx&satellites=S1:N1,S2:N2...
        """
        record = dict(mobile=self.get_argument("mobile", None),
                      lat=self.get_argument("lat", 0),
                      lon=self.get_argument("lon", 0),
                      dop=self.get_argument("dop", 0),
                      timestamp=self.get_argument("timestamp", None),
                      satellites=self.get_argument("satellites", None),
                      seq=int(self.get_argument("seq", 0)))

        if not all(record.itervalues()):
            raise tornado.web.HTTPError(400)

        if (len(record["timestamp"]) != 14):
            raise tornado.web.HTTPError(400)
        try:
            record["timestamp"] = _format_timestamp(record["timestamp"])
        except:
            raise tornado.web.HTTPError(400)

        new_fix = dict(seq=record["seq"],
                       lat=record["lat"],
                       lon=record["lon"],
                       dop=record["dop"],
                       timestamp=record["timestamp"],
                       satellites=record["satellites"])

        if not record["mobile"] in self.mobile_info:
            # this is the first upload for a new terminal
            self.mobile_info[record["mobile"]] = dict(seq=record["seq"],
                                                      last=int(time.time()),
                                                      freq=5, # default
                                                      fixes=[new_fix])
        else:
            if self.mobile_info[record["mobile"]]["seq"] == record["seq"]:
                # append the new_fix if seqs match
                self.mobile_info[record["mobile"]]["last"] = int(time.time())
                self.mobile_info[record["mobile"]]["fixes"].append(new_fix)

        logging.warn("mobile_info: %s", self.mobile_info)
        # response with the latest info
        update_info = dict(freq=self.mobile_info[record["mobile"]]["freq"],
                           seq=self.mobile_info[record["mobile"]]["seq"])
        self.write(urlencode(update_info))


class TestHandler(BaseHandler):
    def post(self):
        print repr(self.get_argument("a"))


# how long the fixes buffered in the server should be cleaned.
# 5 minutes now.
DEBUG_FIXES_TIMEOUT = 60 * 5

if __name__ == "__main__":
    tornado.options.parse_command_line()
    if options.mode.lower() == "debug":
        debug_mode = True
    else:
        debug_mode = False

    app = Application(debug=debug_mode)
    http_server = tornado.httpserver.HTTPServer(app, xheaders=True)
    try:
        http_server.listen(options.port)
        interval_ms = DEBUG_FIXES_TIMEOUT * 1000
        main_loop = tornado.ioloop.IOLoop.instance()
        cleaner = tornado.ioloop.PeriodicCallback(app.cleanup_mobile_info,
                                                  interval_ms,
                                                  io_loop=main_loop)
        cleaner.start()
        main_loop.start()
    except:
        del app
