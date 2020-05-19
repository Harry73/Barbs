import os
import tkinter as tk
import traceback

from src.website.generator import generate_html
from src.website.validator import validate
from src.website.deployer import deploy


WIDTH = 1000
HEIGHT = 600


def open_local(log):
    path = os.path.join(os.getcwd(), 'html', 'generated', 'index.html')
    if not os.path.exists(path):
        log('File not found, generate it first')
        return

    os.startfile(path)


class Application(tk.Frame):
    def __init__(self, master=None):
        super().__init__(master)
        self.pack()
        self.focus_set()
        self.configure(bg='black')

        self.text_lines = []

        self.bind('<KeyPress>', self.keydown)

        self.validate_button = self.button('Validate rulebook', self.on_press(validate), (40, 25))
        self.generate_button = self.button('Generate rulebook website HTML', self.on_press(generate_html), (280, 25))
        self.generate_button = self.button('View local', self.on_press(open_local), (520, 25))
        self.deploy_button = self.button('Update website', self.on_press(deploy), (760, 25))

        # White line between the buttons and text
        divider_canvas = tk.Canvas(self.master, bg='black', highlightthickness=0)
        divider_canvas.pack(expand=tk.YES, fill=tk.BOTH)
        divider_canvas.place(width=WIDTH, height=550, x=0, y=75)
        divider_canvas.create_line(0, 0, WIDTH, 0, fill="#ffffff")

        # Text area
        canvas = tk.Canvas(self.master, bg='black', highlightthickness=0)
        canvas.pack()
        canvas.place(width=WIDTH - 20, height=HEIGHT - 85, x=10, y=85)

        scrollbar = tk.Scrollbar(canvas)
        self.textbox = tk.Text(canvas, width=10, height=10, wrap=tk.WORD, yscrollcommand=scrollbar.set,
                               borderwidth=0, highlightthickness=0, bg='black', fg='white')
        self.textbox.tag_config(tk.NW, background='black', foreground='white')
        self.textbox.configure(font=('Times New Roman', 12), yscrollcommand=scrollbar.set)

        scrollbar.config(command=self.textbox.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.textbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

    def keydown(self, key):
        if key.char and ord(key.char) == 27:
            self.master.quit()

    def button(self, text, command, position, **kwargs):
        button = tk.Button(self.master, text=text, command=command)
        button.configure(bg='gray', fg='white')
        button.pack()
        button.place(bordermode=tk.OUTSIDE, width=200, height=30, x=position[0], y=position[1], **kwargs)
        return button

    def on_press(self, method):
        def _on_press():
            self.text_lines = []
            self.textbox.delete('1.0', tk.END)
            self.master.update()

            try:
                method(self.log_text)
            except Exception as e:
                self.log_text('Error: %s' % str(e))
                traceback.print_exc()

        return _on_press

    def log_text(self, string):
        print(string)
        self.textbox.insert(tk.END, '%s\n' % string)
        self.textbox.see(tk.END)
        self.master.update()


def main():
    base = tk.Tk()
    base.title('Barbs Rulebook Manager')
    base.geometry('%sx%s' % (WIDTH, HEIGHT))
    base.configure(bg='black')

    app = Application(base)
    app.mainloop()


if '__main__' == __name__:
    main()
