#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import logging
import time
import sqlite3

import tornado.httpserver
import tornado.ioloop
import tornado.web
from tornado.options import define, options
define('db', default="gps.db")
define('port', type=int, default=10000)
define('mode', default="deploy")

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
            (r"/gps", GPSHandler),
            (r"/track/([0-9]*)/([0-9]*)", TrackHandler),
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

    def clean(self):
        self.db.close()

    def __del__(self):
        self.clean()

class BaseHandler(tornado.web.RequestHandler):
    @property
    def db(self):
        return self.application.db.cursor

    def get_current_user(self):
        return self.get_secure_cookie("mobile")


class LoginHandler(BaseHandler):
    def get(self):
        self.render("login.html")

    def post(self):
        self.set_secure_cookie("mobile", self.get_argument("mobile"))
        self.redirect("/")


class LogoutHandler(BaseHandler):
    def get(self):
        self.clear_cookie("mobile")
        self.redirect("/")


class MainHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        mobile = self.current_user
        current = int(time.time())
        delta = 5 * 60 * 60
        self.db.execute("SELECT * from gps WHERE mobile=?"
                        "  AND timestamp BETWEEN ? AND ?"
                        "  ORDER BY timestamp",
                        (mobile, (current - delta), current))
        fixes = self.db.fetchall()
        self.render("map.html", fixes=fixes, mobile=mobile)


class TrackHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self, start, end):
        mobile = self.current_user
        self.db.execute("SELECT * from gps WHERE mobile=?"
                        "  AND timestamp BETWEEN ? AND ?"
                        "  ORDER BY timestamp", (mobile, start, end))
        fixes = tornado.escape.json_encode({"fixes": self.db.fetchall()})
        self.write(fixes)


class GPSHandler(BaseHandler):
    def _work(self):
        record = (self.get_argument("mobile", None),
                  self.get_argument("lon", None),
                  self.get_argument("lat", None),
                  self.get_argument("timestamp", None))
        if not all(record):
            raise HTTPError(400)
        self.db.execute("INSERT INTO gps VALUES(?,?,?,?)",
                        record)
        self.write("OK")
        
    def post(self):
        self._work()

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
        tornado.ioloop.IOLoop.instance().start()
    except:
        del app