# Monitorizare retea de calculatoare cu reguli customizabile

Tool pentru administratorii unei infrastructuri de dispozitive pentru a monitoriza comportamente specifice (ad-hoc) ce ar putea avea loc pe acestea.
Administratorul configureaza [4. Reguli] ce produc alerte atunci cand [3. Procesatorul de evenimente] gaseste submultimi din evenimentele
venite prin [2. Transport evenimente], de la [1. Senzori] instalati pe dispozitive, ce satisfac regulile configurate.

## Componente

### 1. Senzori

#### a. File System

Metoda: Se introduc user level hooks pentru API-ul uzual de manipulare a sistemului de fisiere (file creation, modification and deletion).
Pentru submultimea aleasa de API hooked, la momentul apelarii, se trimit pe un Windows pipe datele esentiale (in functie de API call).
Un Hook Server consuma datele de pe pipe, le proceseaza si le trimite spre HUB.

Evenimente obtinute: creare, modificare si stergere a fisierelor (ACTIUNE, TIP, FILEPATH, PROCESUL APELANT)

#### b. Process Creation

Metoda: Similar cu [a. File System], se introduc user level hooks pentru API-ul uzual de creare de procese (CreateProcess).

Evenimente obtinute: executare procese (PROCES PARINTE, COMMAND LINE, PROCES NOU)

#### c. Packet Sniffer

Metoda: Analizeaza traficul de packete si extrage destinatia, tipul de protocol folosit si detalii despre continut (daca nu este criptat).

Evenimente obtinute: detalii despre traficul de pe dispozitiv (DESTINATIE, PROTOCOL, DETALII CONTINUT?)

### 2. Transport evenimente

Senzorii trimit evenimentele generate catre o coada (RabbitMQ/Redis) al [1. Procesatorului de evenimente].
Eventual, pe fiecare dispozitiv ruleaza o aplicatie care agrega evenimentele de la senzori si le trimite catre coada [1. Procesatorului de evenimente].

### 3. Procesator de evenimente

Input: Evenimentele venite de la [2. Senzori]
Output: Alerte generate pe baza configuratiei de monitorizare

Configuratie:

- [4. Reguli] pe baza carora se genereaza alerte
- ...

### 4. Reguli

Regulile, pentru inceput, pot verifica [a. Existenta] unui pattern in/de evenimente si ce [b. Relatie] exista intre dintre acestea.

#### a. Existenta

Se poate verifica daca intr-un eveniment exista anumite valori (EXACT MATCH, REGEX MATCH, etc.) pe campurile specificate.

Exemple:

- Eveniment de tip CREATE FILE, cu filepath ce satisface regex "C:\Windows\\*"
- Eveniment de tip TRAFFIC, cu protocol SMB si destinatie in 192.168.0.0/24

#### b. Relatie

Se poate verifica daca intr-o multime de evenimente, exista o submultime ce satisface o configuratie de verificari de [a. Existenta].

Exemple:

- Eveniment de tip CREATE FILE, cu filepath (1) SI eveniment de tip PROCESS CREATION ce are (1) in command line
- Cel putin 2 evenimente de tip DELETE FILE, cu filepath ce satisface regex "C:\Windows\*"
