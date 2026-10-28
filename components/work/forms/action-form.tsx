"use client";

import { startTransition } from "react";

/**
 * `<form action={serverAction}>` makes React clear every field after each
 * submit, even when the action returns a validation error. This submits the
 * same FormData through the action but keeps what people typed; forms that
 * should start fresh after success re-mount via `key`.
 */
export function ActionForm({
  action,
  ...props
}: Omit<React.ComponentProps<"form">, "action" | "onSubmit"> & { action: (formData: FormData) => void }) {
  return (
    <form
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    />
  );
}
