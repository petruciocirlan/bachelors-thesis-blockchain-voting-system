import json


class Ballot:
    def __init__(self) -> None:
        if not hasattr(Ballot, "parties"):
            Ballot.load()

    def load() -> None:
        with open("ballot.json") as fd:
            Ballot.parties = json.load(fd)

        Ballot.party_by_id = {}
        Ballot.party_by_name = {}
        Ballot.party_by_abrv = {}
        for party in Ballot.parties:
            Ballot.party_by_id[party["id"]] = party
            Ballot.party_by_name[party["name"]] = party
            Ballot.party_by_abrv[party["abrv"]] = party

    @staticmethod
    def get_parties() -> list:
        if not hasattr(Ballot, "parties"):
            Ballot.load()
        return Ballot.parties

    @staticmethod
    def get_party(id: int = None, name: str = None, abrv: str = None):
        if not hasattr(Ballot, "parties"):
            Ballot.load()

        if id is not None:
            assert id in Ballot.party_by_id, "Invalid party ID"
            return Ballot.party_by_id[id]

        if name is not None:
            assert name in Ballot.party_by_name, "Invalid party name"
            return Ballot.party_by_name[name]

        if abrv is not None:
            assert abrv in Ballot.party_by_abrv, "Invalid party abrv."
            return Ballot.party_by_abrv[abrv]

        return None


if __name__ == "__main__":
    # TODO(@petru): testing
    pass
