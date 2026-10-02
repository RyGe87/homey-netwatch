# Herstel en herbouw

Deze repository bevat de projectbron, manifesten, afbeeldingen, vertalingen en
functionele documentatie. Zie README.md voor het doel en de werking.

## Vereisten en lokale build

Installeer Node.js en npm plus de Homey CLI. De herstelcontrole op 2026-10-02
gebruikte Node.js 25.9.0, npm 11.12.1 en Homey CLI 4.4.1 op macOS.

```sh
npm install --global homey@4.4.1
git clone https://github.com/RyGe87/homey-netwatch.git
cd homey-netwatch
homey app build
homey app validate
```

Een build en validatie werken lokaal zonder verbinding met een Homey.
Het door de CLI aangemaakte `.homeybuild/` is opnieuw aanmaakbaar.
Deze versie gebruikt uitsluitend Node's ingebouwde modules en het Homey SDK;
het `homey`-module wordt door de Homey-firmware geleverd en hoeft niet in deze repo.

## Installatie en configuratie

Voor installatie op een Homey Pro, vanuit de projectmap:

```sh
homey login
homey app install
```

Na installatie: voeg het internet-device toe. Voor de optionele UniFi-gateway configureer je in de appinstellingen het lokale IP-adres en een lokaal aangemaakte UniFi-API-sleutel. Voeg daarna gateway- of presence-devices en flows toe. De API-sleutel en storingshistoriek staan in Homey-instellingen, niet in deze broncode. De bewaarde package-lock.json bevat nog een oudere homey-api-dependency; de huidige package.json en broncode gebruiken die niet. Een build van deze versie heeft geen npm-installatie nodig.

## Wat buiten deze projectmap staat

De broncode volstaat om de app opnieuw te bouwen. Een volledige reconstructie
van een bestaande Homey-installatie vereist daarnaast een Homey-back-up of het
opnieuw instellen van devices, instellingen, pairings en flows. Die gegevens zijn
niet aanwezig in deze lokale ontwikkelmap en worden niet door GitHub geback-upt.
Het verwijderen van de ontwikkelmap wijzigt de geïnstalleerde app op Homey niet.

`node_modules/`, `.homeybuild/` en Finder-metadata zijn opnieuw aanmaakbaar en
worden niet meegeversioneerd. Eventuele `.serena/`-bestanden zijn lokale editor-
/toolinstellingen en zijn niet nodig voor de app of de build. Bewaar wachtwoorden,
API-sleutels en pairing-privésleutels buiten de repository.

