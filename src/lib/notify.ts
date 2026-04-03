import { toast } from "sonner";

const DB_ERROR_MAP: Record<string, string> = {
  "foreign key": "Existem registros vinculados que impedem esta ação.",
  "duplicate key": "Este registro já existe. Verifique os dados duplicados.",
  "violates row-level security": "Você não tem permissão para realizar esta ação.",
  "not found": "Registro não encontrado.",
  "JWT expired": "Sua sessão expirou. Faça login novamente.",
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "Confirme seu e-mail antes de fazer login.",
  "rate limit": "Muitas tentativas. Aguarde alguns minutos.",
};

function translateError(error: unknown): string {
  const msg =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message
      : (error as any)?.message || "Erro desconhecido";

  for (const [key, translated] of Object.entries(DB_ERROR_MAP)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) {
      return translated;
    }
  }
  return msg;
}

export const notify = {
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg),
  warning: (msg: string) => toast.warning(msg),
  info: (msg: string) => toast.info(msg),
  loading: (msg: string) => toast.loading(msg),
  /** Translates common DB/auth errors to friendly PT-BR messages */
  dbError: (error: unknown, fallback?: string) => {
    const translated = translateError(error);
    toast.error(fallback || translated);
  },
};
