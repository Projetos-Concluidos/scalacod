import { toast } from "sonner";

export const notify = {
  success: (msg: string) => toast.success(msg, { icon: "✅" }),
  error: (msg: string) => toast.error(msg, { icon: "❌" }),
  warning: (msg: string) => toast.warning(msg, { icon: "⚠️" }),
  info: (msg: string) => toast.info(msg, { icon: "ℹ️" }),
  loading: (msg: string) => toast.loading(msg),
};
