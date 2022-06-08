import time

from PIL import ImageTk, Image
import tkinter as tk
import cv2

from ballot import Ballot
from machine import VotingMachine

# WIDTH = 960
# HEIGHT = 540


class MainApp(tk.Tk):

    # __init__ function for class tkinterApp
    def __init__(self, *args, **kwargs):

        # __init__ function for class Tk
        tk.Tk.__init__(self, *args, **kwargs)
        # self.geometry(f"{WIDTH}x{HEIGHT}")
        self.resizable(False, False)
        self.title("Vote")

        self.voting_machine = VotingMachine()

        container = tk.Frame(self)
        container.pack(side="top", fill="both", expand=True)

        container.grid_rowconfigure(0, weight=1)
        container.grid_columnconfigure(0, weight=1)

        # initializing frames to an empty array
        self.frames = {}

        # iterating through a tuple consisting
        # of the different page layouts
        for F in (VotePage, BallotQRPage, ScanQRPage):

            frame = F(container, self)

            # initializing frame of that object from
            # startpage, page1, page2 respectively with
            # for loop
            self.frames[F] = frame

            frame.grid(row=0, column=0, sticky="nsew")

        self.show_frame(VotePage)

    # to display the current frame passed as
    # parameter
    def show_frame(self, cont, *args):
        frame = self.frames[cont]
        frame.tkraise()

    def set_qr_code(self, data: bytes):
        qr_code = VotingMachine.generate_qr_code(data)
        qr_code.save('qr_code.png')

        # img = Image.open('qr_code.png')
        img = qr_code.get_image()

        maxsize = (400, 400)
        img.thumbnail(maxsize, Image.ANTIALIAS)

        self.qr_code = ImageTk.PhotoImage(img)

    def encode_vote(self, vote_id):
        self.encoded_vote, self.encoded_vote_hash = self.voting_machine.encode_vote(
            vote_id)
        self.set_qr_code(self.encoded_vote_hash)


class VotePage(tk.Frame):
    def __init__(self, parent, controller):
        tk.Frame.__init__(self, parent)

        self.pack(fill="both", expand=True)

        label = tk.Label(self, text="INTRODUCETI VOTUL", width=100,
                         height=5, background="gray", foreground="white")
        label.pack(side=tk.TOP, fill="both", expand=True)

        parties = Ballot.get_parties()
        for party in parties:
            btn = tk.Button(self, text=party["name"], width=50, height=5)
            btn.pack(side=tk.TOP, pady=5, padx=20)
            btn.bind('<Button-1>',
                     self.vote_for_party(party["id"], controller))

    @staticmethod
    def vote_for_party(id: int, controller):
        def vote(event):
            # print(event)
            print(f"Voted for: {Ballot.get_party(id=id)['name']} (id:{id})")

            controller.encode_vote(id)
            # controller.set_qr_code()

            controller.show_frame(BallotQRPage)

        return vote


class BallotQRPage(tk.Frame):
    def __init__(self, parent, controller):
        tk.Frame.__init__(self, parent)
        self.controller = controller

        label = tk.Label(self, text="SCANATI CODUL QR CU APLICATIA DE VOT\nPENTRU A PUTEA VERIFICA ULTERIOR CA\nVOTUL DVS. A FOST LUAT IN CALCUL",
                         width=100, height=5, background="gray", foreground="white")
        label.pack(side=tk.TOP)

        self.canvas = None

        bottom_frame = tk.Frame(self)
        bottom_frame.pack(side=tk.BOTTOM, fill="both", expand=True)

        btn = tk.Button(
            bottom_frame, text="TRIMITE VOT FARA POSIBILITATE\nDE VERIFICARE ULTERIOARA", width=30, height=5)
        btn.pack(side=tk.LEFT, padx=20, pady=10)
        btn.bind('<Button-1>', lambda _: print("Pressed [SKIP]"))

        btn = tk.Button(bottom_frame, text="AM SCANAT", width=30, height=5)
        btn.pack(side=tk.RIGHT, padx=20, pady=10)
        btn.bind('<Button-1>', lambda _: controller.show_frame(ScanQRPage))

    def tkraise(self, aboveThis=None) -> None:
        super().tkraise(aboveThis)
        if self.canvas is not None:
            self.canvas.destroy()

        qr_code = self.controller.qr_code

        self.canvas = tk.Canvas(
            self, width=qr_code.width(), height=qr_code.height())
        self.canvas.pack(side=tk.TOP, pady=10, padx=10)
        self.canvas.create_image(10, 10, anchor=tk.NW, image=qr_code)


class ScanQRPage(tk.Frame):
    def __init__(self, parent, controller):
        tk.Frame.__init__(self, parent)
        self.controller = controller

        label = tk.Label(self, text="PREZENTATI CODUL QR DIN APLICATIA MOBILA OFICIALA",
                         width=100, height=5, background="gray", foreground="white")
        label.pack(side=tk.TOP)

        self.cam = None

    def tkraise(self, aboveThis=None) -> None:
        super().tkraise(aboveThis)

        bottom_frame = tk.Frame(self)
        bottom_frame.pack(side=tk.BOTTOM, fill="both", expand=True, pady=10)

        label = None

        cap = cv2.VideoCapture(0)
        print("[WEBCAM] Scanning for QR code...")
        while True:
            ret, frame = cap.read()
            data = VotingMachine.decoder(frame, frame)

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            img = Image.fromarray(gray)
            # img.save("test.png")
            img = ImageTk.PhotoImage(img)

            if label is None:
                label = tk.Label(bottom_frame, image=img)
            else:
                label.config(image=img)

            label.image = img
            label.pack()

            self.controller.update()
            time.sleep(0.01)

            # TODO(@petru): validate and sign data (transaction)
            if data is not None:
                print(data)
                return


if __name__ == "__main__":
    MainApp().mainloop()
