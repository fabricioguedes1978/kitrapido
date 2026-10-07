<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep USB QR reading as an opt-in mode in the Central, with automatic recognition and refocus after delivery; this avoids competing with camera scanning and manual search.
- Decode complete QR credentials in a browser-safe pure module; tolerate keyboard punctuation changes only for USB input and validate the event roster before opening an athlete.
- Store athlete correction requests separately from deliveries; resolve allowlisted personal-data corrections atomically through an event-manager-authorized database function, preserving kit, stock and delivery records.
- Derive audit labels and descriptions in a browser-safe presentation helper from existing logs; preserve original history and only name allowlisted changed fields to avoid exposing secrets.
