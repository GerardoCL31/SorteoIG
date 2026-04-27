# Sorteo Instagram

Aplicacion web estatica para hacer sorteos a partir de comentarios de Instagram exportados o pegados.

## Uso

1. Abre `index.html` en el navegador.
2. Pega comentarios o carga un archivo `.csv`, `.txt` o `.json`.
3. Ajusta reglas: usuarios unicos, menciones minimas, hashtag requerido y usuarios excluidos.
4. Pulsa `Cargar` y despues `Sortear ganador`.
5. Usa `Exportar` para guardar un JSON con el resultado y los participantes validos.

## Formatos aceptados

Texto por linea:

```txt
@usuario Me apunto! @amigo #sorteo
usuario2 Quiero participar @cuenta
```

CSV basico:

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

## Nota sobre Instagram

La app no pide credenciales ni scrapea Instagram. Para leer comentarios automaticamente desde Instagram haria falta integrar la API oficial de Meta con permisos de la cuenta, o usar una exportacion externa de comentarios.
