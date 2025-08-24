import { toast as hotToast } from "react-hot-toast";
export function useToast() {
  return { toast: {
    success: (m: string) => hotToast.success(m),
    error: (m: string) => hotToast.error(m),
    info: (m: string) => hotToast(m),
    message: (m: string) => hotToast(m),
  }};
}
