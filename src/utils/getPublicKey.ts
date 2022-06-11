import ethCrypto from "eth-crypto";
import getPrivateKey from "./getPrivateKey";

export default function getPublicKey(): string {
  const pubk = ethCrypto.publicKeyByPrivateKey(getPrivateKey());

  return pubk;
}
