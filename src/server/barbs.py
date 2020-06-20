import os

from flask import Flask, render_template, request

server = Flask(__name__)
server.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0


@server.route('/')
def hello():
    return render_template('rulebook.html')


@server.route('/api')
def api():
    return render_template('api.html')


@server.route('/calendar')
def calendar():
    month = request.args.get('month')
    if os.path.exists(os.path.join(os.getcwd(), 'templates', '%s.html' % month)):
        return render_template('%s.html' % month)
    else:
        return 'bad month you fool'


if __name__ == '__main__':
    # Use iptables to route traffic from port 80 to port 3000
    # sudo iptables -A PREROUTING -t nat -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3000
    server.run(host='0.0.0.0', port=3000)
