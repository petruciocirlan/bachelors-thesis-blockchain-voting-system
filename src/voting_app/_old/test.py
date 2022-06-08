from kivymd.app import MDApp
from kivymd.uix.button import MDRaisedButton
from kivymd.uix.screen import MDScreen

from ballot import Ballot

# TODO(@petru): remove this on production
from kivy.core.window import Window
Window.size = (340, 600)


class Main(MDApp):
    def build(self):
        self.ballot = Ballot()

        screen = MDScreen()

        party_count = len(self.ballot.parties)
        distance = 1.0 / party_count
        offset = 1.0 - distance / 2.0
        # print(f"Distance: {distance}")
        for party in self.ballot.parties:
            # print(f"Offset: {offset}")
            btn = MDRaisedButton(text=party["name"], pos_hint={'center_x': 0.5, 'center_y': offset})
            btn.on_press = Main.vote_for_party(party["id"])

            screen.add_widget(btn)
            offset -= distance
        return screen

    @staticmethod
    def vote_for_party(id : int):
        def vote():
            print(f"Voted for: {Ballot.get_party(id=id)['name']} (id:{id})")
            # TODO(petru): encrypt vote
            # TODO(petru): 

        return vote


Main().run()
