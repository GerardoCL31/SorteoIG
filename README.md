# Instagram Giveaway

Static web app for running giveaways from exported or pasted Instagram comments.

## Usage

1. Open `index.html` in your browser.
2. Paste comments or upload a `.csv`, `.txt`, or `.json` file.
3. Adjust the rules: unique users, minimum mentions, required hashtag, and excluded users.
4. Click `Cargar` and then `Sortear ganador`.
5. Use `Exportar` to save a JSON file with the result and the valid participants.

## Accepted Formats

Text, one entry per line:

```txt
@usuario Me apunto! @amigo #sorteo
usuario2 Quiero participar @cuenta
```

Basic CSV:

```csv
usuario,comentario
usuario2,"Quiero participar @cuenta #sorteo"
```

JSON:

```json
[
  { "user": "usuario", "text": "Me apunto @amigo #sorteo" },
  { "username": "usuario2", "comment": "Participo" }
]
```

## Instagram Note

The app does not ask for credentials or scrape Instagram. Reading comments automatically from Instagram would require integrating the official Meta API with account permissions, or using an external comment export.
