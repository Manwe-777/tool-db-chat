import getToolDb from "./getToolDb";

export default function getPrivateKey(): string {
  const toolDb = getToolDb();

  return (toolDb as any)._user.account.privateKey;
}
