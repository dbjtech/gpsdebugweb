#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import logging
import time
import sqlite3
from urllib import urlencode
from datetime import datetime

from IPy import IP

import tornado.httpserver
import tornado.ioloop
import tornado.web
from tornado.escape import json_encode, json_decode
from tornado.options import define, options
define('db', default="gps.db")
define('port', type=int, default=10000)
define('mode', default="deploy")

import cStringIO
import hashlib
import os.path

import captcha

# how long the fixes buffered in the server should be cleaned.
# 5 minutes now.
DEBUG_FIXES_TIMEOUT = 60 * 5
# web page query frequency
DEFAULT_FREQ = 5
START_SEQ = 1
SECONDS_A_DAY = 60 * 60 * 24
PRECISION = 1E-5


class DBConnection(object):
    def __init__(self, db_file):
        self.conn = sqlite3.connect(db_file, isolation_level=None)
        self.cursor = self.conn.cursor()

    def close(self):
        try:
            self.cursor.close()
            self.conn.close()
        except:
            logging.exception("db close error.")

    def __del__(self):
        self.close()


class Application(tornado.web.Application):

    def __init__(self, debug=False):
        handlers = [
            (r"/peek", PeekHandler),
            (r"/track/([0-9]*)/([0-9]*)", TrackHandler),
            (r"/captcha", CaptchaHandler),
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
        # dict(mobile=dict(seq, freq, last, fixes=[dict(),...]))
        self.mobile_info = dict()

    def clean(self):
        self.db.close()

    def __del__(self):
        self.clean()

    def cleanup_mobile_info(self):
        current = int(time.time())
        for k, v in self.mobile_info.items():
            if (current - v["last"] >= DEBUG_FIXES_TIMEOUT):
                del self.mobile_info[k]


class BaseHandler(tornado.web.RequestHandler):
    @property
    def db(self):
        return self.application.db.cursor

    @property
    def mobile_info(self):
        return self.application.mobile_info

    def get_current_user(self):
        return self.get_secure_cookie("mobile")

def _verify_captcha(captcha, captcha_hash):
    m = hashlib.md5()
    m.update(captcha.lower())
    return captcha_hash == m.hexdigest()

class LoginHandler(BaseHandler):
    def get(self):
        is_public = IP(self.request.remote_ip).iptype() == "PUBLIC"
        self.render("login.html", is_public=is_public)

    def post(self):
        mobile = self.get_argument("mobile", None)
        dest = "/"
        if mobile:
            is_public = IP(self.request.remote_ip).iptype() == "PUBLIC"
            captcha = self.get_argument("captcha", None)
            captcha_hash  = self.get_cookie("captchahash")
            if is_public:
                if not (captcha and captcha_hash and
                        _verify_captcha(captcha, captcha_hash)):
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
        map_type = "gmap.html"
        if self.get_argument("t", None) == "b":
            map_type = "bmap.html"
        self.render(map_type, mobile=mobile)


def _format_timestamp(ts):
    """Format YYYYmmddHHMMSS to YYYY-mm-dd HH:MM:SS
    """
    return time.strftime("%Y-%m-%d %H:%M:%S", time.strptime(ts, "%Y%m%d%H%M%S"))


class PeekHandler(BaseHandler):
    TOP_USER = "DBJ"
    TOP_PSWD = "showmethemoney"

    def get_current_user(self):
        scheme, _, token = self.request.headers.get('Authorization', '').partition(' ')
        if scheme.lower() == 'basic':
            user, _, pwd = token.decode("base64").partition(':')
            if user == self.TOP_USER and pwd == self.TOP_PSWD:
                return True
        return False

    def get(self):
        if not self.current_user:
            self.set_status(401)
            self.set_header("WWW-Authenticate", "basic realm='DBJ GPS Test'")
            self.render("peek.html", error=True)
            return
        else:
            self._work()

    def _work(self):
        self.db.execute("SELECT mobile, count(*),"
                        " min(timestamp) as mints, max(timestamp) as maxts"
                        " FROM gps GROUP BY mobile ORDER BY maxts DESC")
        self.render("peek.html", error=False, terms=self.db.fetchall())


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


class CaptchaHandler(BaseHandler):
    FONT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                             "Arial.ttf")

    def get(self):
        cg = captcha.CaptchaGen(self.FONT_FILE, (100, 50, 30), (60, 40, 30),
                                textsize=24, noiselines=True, squiggly=False)
        word = captcha.createWord()
        c = cg.generateCaptcha(word)
        buf = cStringIO.StringIO()
        c.writeImage(buf)

        m = hashlib.md5()
        m.update(word.lower())

        self.set_cookie("captchahash", m.hexdigest())
        self.set_header("Content-type", "image/jpeg")
        self.write(buf.getvalue())


class GPSDebugHandler(BaseHandler):
    """Show debugging information from the terminal.

    The information will not be saved in the db.
    """

    @tornado.web.authenticated
    def get(self):
        """Retrieve current debug info in the server from the web.

        This function also updates `seq' and `freq'.
        """
        # TODO: this is bad, should use comet.
        fixes = []
        start = None
        if self.current_user in self.mobile_info:
            me = self.mobile_info[self.current_user]
            seq = int(self.get_argument("seq", START_SEQ))
            freq = int(self.get_argument("freq", DEFAULT_FREQ))
            start = self.get_argument("start", None)
            # remove unmatched fixes
            fixes = [t for t in me["fixes"] if t["seq"] == seq]

            me.update(seq=seq,
                      freq=freq,
                      start=start or me["start"],
                      last=int(time.time()),
                      fixes=[])
        res = dict(fixes=fixes)
        if start:
            res.update(start=True)
        self.write(json_encode(res))

    def post(self):
        """Collect data from the terminal.

        format:
        mobile=xxxxx&lat=xxx.xxxx&lon=xxxx.xxxx&range_rms=xxx&
        std_lat=xxx&std_lon=xxx&std_alt=xxx&
        timestamp=YYYYmmddHHMMSS&seq=xxx&satellites=S1:N1,S2:N2...
        """
        record = dict(mobile=self.get_argument("mobile", None),
                      lat=float(self.get_argument("lat")),
                      lon=float(self.get_argument("lon")),
                      alt=float(self.get_argument("alt")),
                      std_lat=float(self.get_argument("std_lat")),
                      std_lon=float(self.get_argument("std_lon")),
                      std_alt=float(self.get_argument("std_alt")),
                      range_rms=float(self.get_argument("range_rms")),
                      timestamp=self.get_argument("timestamp"),
                      satellites=self.get_argument("satellites", None),
                      misc=self.get_argument("misc", None),
                      seq=int(self.get_argument("seq", 0)))

        # TODO: reasonable sanity check

        # TODO: check the digest to avoid bad uploaders

        try:
            record["timestamp"] = _format_timestamp(record["timestamp"])
        except:
            raise tornado.web.HTTPError(400)

        new_fix = dict(seq=record["seq"],
                       lon=record["lon"],
                       lat=record["lat"],
                       alt=record["alt"],
                       std_lon=record["std_lon"],
                       std_lat=record["std_lat"],
                       std_alt=record["std_alt"],
                       range_rms=record["range_rms"],
                       timestamp=record["timestamp"],
                       satellites=record["satellites"],
                       misc=record["misc"])
        me = self.mobile_info.get(record["mobile"])
        if not me:
            # this is the first upload for a new terminal
            me = dict(seq=record["seq"],
                      last=int(time.time()),
                      freq=DEFAULT_FREQ,
                      start=None,
                      fixes=[new_fix])
            self.mobile_info[record["mobile"]] = me
        else:
            if me["seq"] == record["seq"]:
                # append the new_fix if seqs match
                me["last"] = int(time.time())
                me["fixes"].append(new_fix)

        self.save_fix(record["mobile"], me, new_fix)

        # response with the latest info
        update_info = dict(freq=me["freq"], seq=me["seq"])
        if me["start"]:
            update_info["start"] = me["start"]
            me["start"] = None

        self.write(urlencode(update_info))

    def is_valid_fix(self, fix):
        if not (0 < abs(fix["lon"]) < 180):
            return False
        if not (0 < abs(fix["lat"]) < 90):
            return False

        # For the sake of the Agilen Simulator, which can only
        # generates signals in 2007.5
        # t = datetime.strptime(fix["timestamp"], "%Y-%m-%d %H:%M:%S")
        # if abs((t - datetime.utcnow()).total_seconds()) > SECONDS_A_DAY:
        #    return False

        return True

    def save_fix(self, mobile, me, fix):
        if not self.is_valid_fix(fix):
            return
        if me.get("last_fix"):
            if ((abs(fix["lon"] - me["last_fix"]["lon"]) < PRECISION) and
                (abs(fix["lat"] - me["last_fix"]["lat"]) < PRECISION)):
                return

        me["last_fix"] = fix
        self.db.execute("INSERT INTO gps VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                        (mobile, fix["lat"], fix["lon"], fix["alt"],
                         fix["std_lat"], fix["std_lon"], fix["std_alt"],
                         fix["range_rms"], fix["timestamp"], fix["satellites"],
                         fix["misc"]))


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
