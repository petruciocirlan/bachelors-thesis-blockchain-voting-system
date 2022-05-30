# Voting system on blockchain using anonymous and private 'air-gapped' voting

## Voter side

### Interaction

1. Voter goes to voting section and gets their ID scanned (this checks if citizen is eligible to vote and hasn't voted prior).
2. Voter goes into voting booth, where a voting machine is waiting (e.g., a state-issued tablet).
3. Voter makes their vote on the digital ballot.
4. The voting machine displays a QR code representing voter's filled voting ballot.
5. Voter scans QR code (using an official app or custom one that follows state-issued standards for current voting session).
6. Voter signs the filled voting ballot (i.e., presses "sign ballot" on application), after which a QR code is displayed on his mobile device (e.g., smart phone), representing the voter's filled and signed voting ballot.
7. Voter presents QR code to voting machine.
8. Voting machine scans QR code, completing the vote transaction.

### Behind the interaction

The voting machine is a state-issued device that has its own unique PRIVATE KEY and features a digital ballot that can be completed by voters. Once a voter fills the voting ballot, the machine validates the filled ballot and creates a partial transaction that contains the encrypted filled ballot (using Homomorphic encryption) and the machine's signature over the filled ballot (this ensures the validity and intregrity of the ballot). Next, the partial transaction is encoded into a QR code and displayed for the voter.

The voter scans the QR code to receive the partial transaction, which then they sign it (similarly to how to machine signed the filled ballot) to produce the complete transaction. The complete transaction (and possibly the voter's public key) is encoded to a QR code and then shown towards the voting machine's scanner.

The voting machine scans the voter's QR code, validates it (checks if ballot is still valid per the machine's signature and checks if voter's signature is valid). If the complete transaction is valid, the voting machine sends the filled and signed ballot to either the blockchain or internal storage to be sent to the blockchain at a later date (pros and cons for either method is discussed in [Storing votes in the voting machine VS sending them right away]).

After the voting is done, the voter will be able to see their vote (i.e., transaction) on the blockchain, with their signature. However, the vote itself will be encrypted. This way, even if someone succeeds in finding a voter's vote on the block chain, the vote itself will still be private (this avoids the problem of vote buying).

### Reason for having a state-issued device

When developing a solution to secure and anonymous voting on the blockchain, one of the challenges is making sure a vote is valid, without revealing the vote itself. There are some solutions, using Zero Knowledge Proofs (ZKP), however, with some constraints. Moreover, any proof would need to be non-interactive zero knowledge proof (NIZK), because interactive proofs are not ideal for blockchains. Examples of NZIK are for limited/approval/divisible/Borda(preferential) votes [http://www0.cs.ucl.ac.uk/staff/J.Groth/ACNS05VoteProofFull.pdf], however, more exotic ballots may not have a known ZKP. As such, a machine that enforces ballots to be filled correctly is used.

Other blockchain voting systems allow for voting online, remotely. This means that voters have to certify through webcam and other means that they are a citizen, and, for a vote to be approved, public keys (some solutions store the private key in the account, on cloud!) would have to be associated with the citizen (loss of anonymity). Another problem of voting remotely is that they rely on their device's security when voting. Not being monitored also leaves the voter susceptible to coercion and vote buying (having a person over their shoulder that can force them to vote as they want and/or verify they voted as agreed).

By keeping the voting physical in a voting booth and checking the eligibility of the voter at the entrance, this eliminates coercion, vote buying and direct associtation of citizen to vote, and the voter can rely on the security of an officially issued machine instead of their own devices.

### Storing votes in the voting machine VS sending them right away

On the one hand, having the voting machine send votes as they happen, would mean to have it connected to a network (preferably through a secure VPN). Even with security measures in place, any device connected to a network is **exposed** to being a target of cyber attacks, especially if the polling station is poorly financed and operated by officials that lack expertise. However, the advantage of sending votes as they happen helps situations such as having the device vandalized/stolen and losing the votes that that the machine registered.

A stolen voting machine may mean someone could try sending illegitimate votes, however, on the blockchain technology used, Hyperledger Fabric, before transactions are added to the blockchain, they need to be accepted. Once a machine is stolen, the authorities could blacklist it from having transactions executed on the blockchain, and could even revert all votes signed by that machine (such as adding new transactions that nullify the chosen transactions).

On the other hand, having the voting machine store the votes until a later date to send them to the blockchain would let us keep it disconnected and safe from any network attacks. However, as previously said, we would lose any votes from defective/stolen machines. Furthermore, a new problem arises: when to finally send the votes. It would have to be before the voting session ends and the blockchain would stop receiving votes, but after people have had their chance to vote. Also, in-between the polling station closing and the officials sending the transactions, some malicious operator could inject illegitimate transactions (if the device/station monitoring does not have any counter measures against this).

Based on the given arguments, sending the votes as they happen seems to be the better option. Even if malicious attackers would gain access to the private network, they would still need to break through the voting machine's security and extract the private key to sign transactions. Worst case, they do get the private key and send illegitimate votes, but they can get found out (more votes sent from polling section than citizens showed up) and votes from that device can be nulled. Ideally, investigative efforts would lead to only illegitimate votes to be nulled, otherwise, most, if not all, votes from that machine could be lost that way.

### Voter mobile device application

To sign the transaction and complete it, the voter would require to have an application able to scan and generate QR codes, and sign a transaction using their personal PRIVATE KEY. This is not a complex application and could be even created by savvy citizens, given the transaction and signing standards used by the governing entity of the voting session.

This method, although it introduces more steps than the classic voting by stamp or electronically, makes sure that the PRIVATE KEY is never accessible to anyone else and even that the PUBLIC KEY is not associated with the citizen, by using an 'air-gapped' way of communication. Preferably, the mobile device would also be offline, having had a restart after becoming offline and before going online, so as to not have the PRIVATE KEY in memory, in case the device is compromised.

## Blockchain side

The blockchain technology used is Hyperledger Fiber, a permissioned blockchain. This technology was chosen over others such as Ethereum, because [...].

The blockchain would be distributed among the government entities. Each political party is be incentivized to run a number of nodes, such as to keep the voting as fair as possible (more specifically, to not give the other parties the liberty of gaining advantage by trying to maliciously affect the votes ledger).

The votes (i.e., transactions) are sent to smart contracts (called Chaincodes by Fabric) that tracks all voting. Voting can only take place in the interval of time set when the smart contract is deployed. Once the voting ended, the same smart contract would allow retrieving the, still encrypted, final votes (computing them could still be possible by observing the transactions, though they would still end up with encrypted - salted - votes).

All votes are encrypted unsing Homomorphic encryption, which allows operations such as addition to be performed on the still encrypted data, which can then be decrypted to obtain the sum (E(x) + E(y) = E(x+y)). The encryption key would be a state-issued PUBLIC KEY. The private key is kept "under lock and key" even after the voting ended, and would optimally have been split apart to multiple parties, so as to not give anyone access to seeing the decrypted current votes.

Once the voting is over, the parties that hold the PRIVATE KEY pieces would come together to decrypt the final vote tally and publish it publicly, and then destroy the key. Furthermore, the blockchain will be halted permanently and a copy would be made available publicly.

Everyone would be able to check if the voting was done correctly by checking the blockchain and even check if their vote was taken into account. They would reach the same encrypted end result, which they can compare to the tally results made public. Because the votes on the blockchain are encrypted with the government PUBLIC KEY, they can compare the final tally in the blockchain to the final tally published by the government by encrypting the published tally with the PUBLIC KEY.
