import { type ComponentProps } from "solid-js"

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path data-slot="logo-logo-mark-shadow" d="M12 16H4V8H12V16Z" fill="var(--icon-weak-base)" />
      <path data-slot="logo-logo-mark-o" d="M12 4H4V16H12V4ZM16 20H0V0H16V20Z" fill="var(--icon-strong-base)" />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M60 80H20V40H60V80Z" fill="var(--icon-base)" />
      <path d="M60 20H20V80H60V20ZM80 100H0V0H80V100Z" fill="var(--icon-strong-base)" />
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 180 42"
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <g>
        {/* K */}
        <path d="M12 24H6V18H12V24Z" fill="var(--icon-weak-base)" />
        <path d="M6 36H0V6H6V36ZM24 18H6V6H24V18ZM24 36H6V24H24V36Z" fill="var(--icon-base)" />
        {/* Z */}
        <path d="M42 26H30V16H42V26Z" fill="var(--icon-weak-base)" />
        <path d="M54 16H30V6H54V16ZM54 26H42V16H54V26ZM54 36H30V26H54V36Z" fill="var(--icon-base)" />
        {/* C */}
        <path d="M84 30H66V18H84V30Z" fill="var(--icon-weak-base)" />
        <path d="M84 12H66V30H84V36H60V6H84V12Z" fill="var(--icon-strong-base)" />
        {/* o */}
        <path d="M108 30H96V18H108V30Z" fill="var(--icon-weak-base)" />
        <path d="M108 12H96V30H108V12ZM114 36H90V6H114V36Z" fill="var(--icon-strong-base)" />
        {/* d */}
        <path d="M138 30H126V18H138V30Z" fill="var(--icon-weak-base)" />
        <path d="M138 12H126V30H138V12ZM144 36H120V6H138V0H144V36Z" fill="var(--icon-strong-base)" />
        {/* e */}
        <path d="M174 24V30H156V24H174Z" fill="var(--icon-weak-base)" />
        <path d="M156 12V18H168V12H156ZM174 24H156V30H174V36H150V6H174V24Z" fill="var(--icon-strong-base)" />
      </g>
    </svg>
  )
}
