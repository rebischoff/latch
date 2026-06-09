# 06 — Widgets demo page (business surface)

> **Status:** Deferred (2026-06-08). **Not in the revised spike plan.**
>
> **Reason:** Policy proof uses the **manifest inspector** on user detail ([04](./04-users-ui.md)) against the **vocabulary fixture** ([02](./02-vocabulary-fixture.md)). A business list page + `widgets` table is unnecessary for this exercise.

## Former goal (archived)

`/widgets` — read-only list of widget rows projected through `widget_list` manifest for the **Act as** principal.

## If revived later

Would require a `widgets` table migration (seeds, optional assignments) and a minimal list DAL. Out of scope until a task explicitly needs **row_scope `own` + DAL list filtering** proof in the UI.
