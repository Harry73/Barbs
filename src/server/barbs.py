from flask import Flask
from flask import render_template

server = Flask(__name__)


@server.route('/')
def hello():
    return render_template('index.html')


if __name__ == '__main__':
    # An iptables rule forwards traffic from port 80 to port 3000
    server.run(host='0.0.0.0', port=3000)
