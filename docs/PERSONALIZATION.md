# So i personalització · web 1.4.0

La icona de paleta a la capçalera obre **Personalitzar** des de qualsevol pantalla. L’altaveu adjacent activa o silencia immediatament l’àudio. Tot es desa al navegador, sense compte, i no altera les partides ni el reglament.

## Opcions escollides

- **Vidre suau**, predeterminat: cos de fusta, impacte curt i una petita ressonància de vidre, amortida en desenes de mil·lisegons. Volum inicial 45%.
- **Fusta**: impacte més sec i greu.
- **Toc discret**: impacte breu amb menys energia.
- Volum 0–100%, mostres de moviment/captura/intercanvi/retorn, avisos opcionals d’escac/inici/final. Navegar l’historial és silenciós per defecte.
- Cinc taulers: Naufragi, Fusta clàssica, Mar, Pissarra i Contrast. Tres paletes de peces originals: Espectrals, Ivori i tinta, Bronze. Les formes i significats de les peces són els mateixos.
- Mida compacta, còmoda o gran en escriptori; en mòbil s’aprofita l’amplada disponible. Animacions automàtiques, desactivades, ràpides o suaus. La preferència del sistema de moviment reduït sempre preval.
- Coordenades, destinacions legals, ressaltat de l’última jugada, vaixell de fons i mode concentració. L’escac i les caselles de retorn continuen visibles perquè són necessaris per jugar.
- Accents verd espectral, blau marí o ambre. Previsualització visual immediata i restabliment dels valors inicials.

## Referències consultades

Lichess ofereix un selector de conjunts de so amb volum i mostra immediata; s’ha pres aquest patró com a referència per als controls. [Implementació oficial del selector de so](https://github.com/lichess-org/lila/blob/master/ui/dasher/src/sound.ts).

Les preferències visuals de Lichess ofereixen ajustos de tema i fons. Per a pirescacs s’han prioritzat paletes amb contrast, llegibilitat, mida i ajudes del tauler, mantenint la direcció artística de naufragi fantasmal. Aquesta tria és una decisió de disseny pròpia. [Implementació oficial de preferències visuals](https://github.com/lichess-org/lila/blob/master/ui/dasher/src/theme.ts).

El fitxer de llicències de Lichess distingeix diversos sons amb llicència i altres excepcions no lliures. En aquesta web s’ha creat una síntesi i una interfície originals, sense copiar enregistraments ni codi de Lichess. [Avisos de llicència de Lichess](https://github.com/lichess-org/lila/blob/master/COPYING.md).

L’àudio s’activa des d’un gest de l’usuari; en recarregar no es reprodueixen jugades anteriors ni s’encuen sons bloquejats. Aquesta conducta té en compte les restriccions d’autoplay. [Guia oficial de Web Audio i autoplay de MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).

## Implementació

`src/preferences.ts` defineix un format v2 separat del format de partides. Només accepta booleans, enumeracions conegudes i volum finit acotat; JSON corrupte, versions desconegudes i emmagatzematge inaccessible recuperen els valors inicials. Si falla l’escriptura, els canvis continuen actius durant la sessió i el panell mostra un avís.

`src/sound.ts` sintetitza PCM mono a 24 kHz i guarda els buffers al mateix AudioContext. No necessita descarregar àudio ni cap servei extern. El filtre elimina DC, els extrems tenen fades i el pic queda acotat. El volum fa servir una corba perceptual; el silenci atura les fonts encara actives. No hi ha música ni efectes continus.

Les jugades del joc real es detecten comparant instantànies confirmades del Worker de regles, amb identitat de partida i prefix d’historial. Les variants jugades manualment tenen una intenció de so que només es consumeix en confirmar la posició resultant. Un retorn incomplet no sona; un intercanvi/retorn complet és una sola jugada i un sol esdeveniment d’àudio. Canvis d’anàlisi, importacions, recàrregues i resultats repetits no tornen a sonar. El bot continua treballant quan es canvia només l’aspecte.

El panell és un diàleg modal natiu amb focus contingut, Escape i navegació per fletxes entre pestanyes. La web, editor i exemples comparteixen tauler i paleta; les icones antigues conserven el seu significat amb regles v1.

## Verificació reproduïble

```bash
npm run test:preferences
npm run test:storage
npm run build
```

Per exportar les mateixes mostres de PCM que utilitza el navegador:

```bash
npm run test:preferences -- --samples
```

Es creen tres WAV temporals a `../../work/personalization/`. Les mètriques de les 24 combinacions són a `tests/personalization/audio-metrics.json`. Les proves automàtiques comproven sanejament, persistència, classificació de moviments, buffers, autoplay bloquejat, silenci, volum zero, avisos, historial, recuperació i neteja. El timbre és una aproximació original al caràcter demanat; les mètriques no substitueixen una escolta amb els altaveus o auriculars de l’usuari.

En web 1.4.0, les coordenades queden desactivades per defecte. La preferència té versió 2; es migra el valor antic a desactivat preservant so, colors i altres ajustos. Activar-les després es desa normalment. Els tres estils de peces inclouen el Metge. La zona d’abast del Metge segueix Mostrar destinacions legals.
