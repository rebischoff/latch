"use client";

import { App } from "antd";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useFormState } from "react-hook-form";

export const useConfirmDirtyNavigate = () => {
  const router = useRouter();
  const { modal } = App.useApp();
  const { isDirty } = useFormState();

  return useCallback(
    (href: string) => {
      if (!isDirty) {
        router.push(href);
        return;
      }

      modal.confirm({
        title: "Leave without saving?",
        content: "Unsaved changes will be lost.",
        okText: "Leave",
        onOk: () => router.push(href),
      });
    },
    [isDirty, modal, router],
  );
};
