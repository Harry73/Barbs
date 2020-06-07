import getpass
import os
import paramiko
import scp
import sys


CURRENT_PATH = os.path.dirname(os.path.realpath(sys.argv[0]))
GENERATED_HTML_PATH = os.path.join(CURRENT_PATH, 'html', 'generated')
GENERATED_RULEBOOK_PATH = os.path.join(GENERATED_HTML_PATH, 'rulebook.html')
GENERATED_API_PATH = os.path.join(GENERATED_HTML_PATH, 'api.html')
GENERATED_CALENDAR_PATH = os.path.join(GENERATED_HTML_PATH, 'calendar')
GENERATED_STYLE_PATH = os.path.join(GENERATED_HTML_PATH, 'style.css')

LOCAL_STYLE_SHEET = 'style.css'
CALENDAR_LOCAL_STYLE_SHEET = '../style.css'
REMOTE_STYLE_SHEET = "{{ url_for('static', filename='style.css') }}"

INSTANCE_HOSTNAME = 'ec2-3-82-252-244.compute-1.amazonaws.com'
INSTANCE_USER = 'ubuntu'
KEY_FILE = 'barbs.pem'
TIMEOUT_SEC = 10


def find_ssh_key_path():
    paths_to_try = [
        os.path.join('C:', 'Users', getpass.getuser(), '.ssh', KEY_FILE),
        os.path.join(CURRENT_PATH, KEY_FILE),
    ]

    for path in paths_to_try:
        if os.path.exists(path):
            return path

    raise FileNotFoundError('Could not find SSH key. Place the "%s" file in the same directory as this file or '
                            'in a ".ssh" folder under your username' % KEY_FILE)


def swap(file_path, text_to_replace, replacement_text):
    with open(file_path, 'r', encoding='utf8') as f:
        html = f.read()

    html = html.replace(text_to_replace, replacement_text)

    with open(file_path, 'w+', encoding='utf8') as f:
        f.write(html)


def deploy(log):
    ssh_key_path = find_ssh_key_path()

    # Swap out the style sheet inclusion with one that flask will understand
    swap(GENERATED_RULEBOOK_PATH, LOCAL_STYLE_SHEET, REMOTE_STYLE_SHEET)
    swap(GENERATED_API_PATH, LOCAL_STYLE_SHEET, REMOTE_STYLE_SHEET)
    for month_file in os.listdir(GENERATED_CALENDAR_PATH):
        swap(os.path.join(GENERATED_CALENDAR_PATH, month_file), CALENDAR_LOCAL_STYLE_SHEET, REMOTE_STYLE_SHEET)

    ssh_client = None
    scp_client = None
    try:
        log('Establishing connection')
        ssh_key = paramiko.RSAKey.from_private_key_file(ssh_key_path)
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh_client.connect(hostname=INSTANCE_HOSTNAME, username=INSTANCE_USER, pkey=ssh_key, timeout=TIMEOUT_SEC)

        scp_client = scp.SCPClient(ssh_client.get_transport(), socket_timeout=TIMEOUT_SEC)
        log('Uploading rulebook')
        scp_client.put(GENERATED_RULEBOOK_PATH, remote_path='/home/ubuntu/barbs/templates/rulebook.html')
        log('Uploading api')
        scp_client.put(GENERATED_API_PATH, remote_path='/home/ubuntu/barbs/templates/api.html')
        for month_file in os.listdir(GENERATED_CALENDAR_PATH):
            log('Uploading calendar month %s' % month_file)
            generated_month_path = os.path.join(GENERATED_CALENDAR_PATH, month_file)
            scp_client.put(generated_month_path, remote_path='/home/ubuntu/barbs/templates/%s' % month_file)
        log('Uploading style sheets')
        scp_client.put(GENERATED_STYLE_PATH, remote_path='/home/ubuntu/barbs/static/style.css')

        log('Restarting server')
        ssh_client.exec_command('pm2 restart barbs')

    except Exception:
        raise Exception('Failed uploading files, likely a network error. Regenerate files before re-uploading.')
    else:
        log('Updated website')
    finally:
        # Revert style file
        swap(GENERATED_RULEBOOK_PATH, REMOTE_STYLE_SHEET, LOCAL_STYLE_SHEET)
        swap(GENERATED_API_PATH, REMOTE_STYLE_SHEET, LOCAL_STYLE_SHEET)
        for month_file in os.listdir(GENERATED_CALENDAR_PATH):
            swap(os.path.join(GENERATED_CALENDAR_PATH, month_file), REMOTE_STYLE_SHEET, CALENDAR_LOCAL_STYLE_SHEET)

        if scp_client:
            scp_client.close()
        if ssh_client:
            ssh_client.close()
