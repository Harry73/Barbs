from flask import Flask
from flask import render_template

server = Flask(__name__)


@server.route('/')
def hello():
    return render_template('index.html')


@server.route('/api')
def api():
    return render_template('api.html')


if __name__ == '__main__':
    # Use iptables to route traffic from port 80 to port 3000
    # sudo iptables -A PREROUTING -t nat -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3000
    server.run(host='0.0.0.0', port=3000)
