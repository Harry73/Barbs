import os

CURRENT_PATH = os.getcwd()
HTML_PATH = os.path.join(CURRENT_PATH, 'html')
HTML_GENERATED = os.path.join(HTML_PATH, 'generated')
HTML_TEMPLATES = os.path.join(HTML_PATH, 'templates')
HOME_PAGE = os.path.join(HTML_GENERATED, 'index.html')


def generate_html():
    if not os.path.exists(HTML_GENERATED):
        os.makedirs(HTML_GENERATED)

