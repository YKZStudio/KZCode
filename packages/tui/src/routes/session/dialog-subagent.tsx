import { DialogSelect } from "../../ui/dialog-select"
import { useRoute } from "../../context/route"
import { t } from "../../i18n"

export function DialogSubagent(props: { sessionID: string }) {
  const route = useRoute()

  return (
    <DialogSelect
      title={t("Subagent Actions")}
      options={[
        {
          title: t("Open"),
          value: "subagent.view",
          description: t("the subagent's session"),
          onSelect: (dialog) => {
            route.navigate({
              type: "session",
              sessionID: props.sessionID,
            })
            dialog.clear()
          },
        },
      ]}
    />
  )
}
