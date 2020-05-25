import getpass
import os
import paramiko
import scp


CURRENT_PATH = os.getcwd()
GENERATED_HTML_PATH = os.path.join(CURRENT_PATH, 'html', 'generated')
GENERATED_INDEX_PATH = os.path.join(GENERATED_HTML_PATH, 'index.html')
GENERATED_API_PATH = os.path.join(GENERATED_HTML_PATH, 'api.html')
GENERATED_STYLE_PATH = os.path.join(GENERATED_HTML_PATH, 'style.css')

LOCAL_STYLE_SHEET = 'style.css'
REMOTE_STYLE_SHEET = "{{ url_for('static', filename='/style.css') }}"

INSTANCE_HOSTNAME = 'ec2-3-82-252-244.compute-1.amazonaws.com'
INSTANCE_USER = 'ubuntu'
KEY_FILE = 'barbs.pem'
TIMEOUT_SEC = 10


def find_ssh_key_path():
    paths_to_try = [
        os.path.join('C:', 'Users', getpass.getuser(), '.ssh', KEY_FILE),
        os.path.join(os.getcwd(), KEY_FILE),
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
    log('Updating web rulebook')
    ssh_key_path = find_ssh_key_path()

    # Swap out the style sheet inclusion with one that flask will understand
    swap(GENERATED_INDEX_PATH, LOCAL_STYLE_SHEET, REMOTE_STYLE_SHEET)
    swap(GENERATED_API_PATH, LOCAL_STYLE_SHEET, REMOTE_STYLE_SHEET)

    ssh_client = None
    scp_client = None
    try:
        ssh_key = paramiko.RSAKey.from_private_key_file(ssh_key_path)
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh_client.connect(hostname=INSTANCE_HOSTNAME, username=INSTANCE_USER, pkey=ssh_key, timeout=TIMEOUT_SEC)

        scp_client = scp.SCPClient(ssh_client.get_transport(), socket_timeout=TIMEOUT_SEC)
        scp_client.put(GENERATED_INDEX_PATH, remote_path='/home/ubuntu/barbs/templates/index.html')
        scp_client.put(GENERATED_API_PATH, remote_path='/home/ubuntu/barbs/templates/api.html')
        scp_client.put(GENERATED_STYLE_PATH, remote_path='/home/ubuntu/barbs/static/style.css')

        ssh_client.exec_command('pm2 restart barbs')

    except scp.SCPException:
        log('Failed to upload files')
    except paramiko.SSHException:
        log('Failed to restart the web server')
    else:
        log('Updated web rulebook')
    finally:
        if scp_client:
            scp_client.close()
        if ssh_client:
            ssh_client.close()

        # Revert style file
        swap(GENERATED_INDEX_PATH, REMOTE_STYLE_SHEET, LOCAL_STYLE_SHEET)
        swap(GENERATED_API_PATH, REMOTE_STYLE_SHEET, LOCAL_STYLE_SHEET)
