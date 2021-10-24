import os

from flask import Flask, redirect, render_template, request

server = Flask(__name__)
server.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0


@server.route('/')
def home_page():
    return redirect('/Barbs/Rulebook', code=302)


@server.route('/Barbs/Rulebook')
def barbs_rulebook():
    return render_template('rulebook.html')


@server.route('/Barbs/API')
def api():
    return render_template('api.html')


@server.route('/api')
def api_redirect():
    return redirect('/Barbs/API', code=302)


@server.route('/Barbs/Calendar')
def calendar():
    month = request.args.get('month')
    if os.path.exists(os.path.join(os.getcwd(), 'templates', '%s.html' % month)):
        return render_template('%s.html' % month)
    else:
        return 'bad month you fool'


@server.route('/calendar')
def calendar_redirect():
    return redirect('/Barbs/Calendar', code=302)


if __name__ == '__main__':
    # Use iptables to route traffic from port 80 to port 3000
    # sudo iptables -I PREROUTING -t nat -p tcp --dport 80 -j REDIRECT --to-ports 3000
    server.run(host='0.0.0.0', port=3000)
