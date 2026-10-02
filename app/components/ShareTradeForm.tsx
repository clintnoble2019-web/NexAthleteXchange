import crypto from "node:crypto";
import ShareTradeFormClient, { Props } from "./ShareTradeFormClient";

export default function ShareTradeForm(props: Omit<Props, "requestKey">) {
  return <ShareTradeFormClient {...props} requestKey={crypto.randomUUID()}/>;
}
