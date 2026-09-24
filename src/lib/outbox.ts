import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure";

/** Sharing a letter, without a network.
 *  A fresh key is made for this one letter, used once to sign it, and thrown
 *  away, so nothing links the letter to her, her phone, or her other letters.
 *  The signed letter waits in the outbox. It leaves only when she hands it on
 *  as a file (memory card, a trusted phone); whoever has a connection can
 *  post it to the Wall of Voices. This app never sends it itself. */
export function sealLetter(text: string, theme: string, lang: string) {
  const sk = generateSecretKey();
  const event = finalizeEvent({
    kind: 1,
    created_at: Math.floor(Date.now() / 1000 / 3600) * 3600, // hour precision: no exact time
    tags: [["t", "wallofvoices"], ["t", theme.toLowerCase()], ["l", lang]],
    content: text,
  }, sk);
  const pubkey = getPublicKey(sk);
  sk.fill(0);
  return { pubkey, event };
}
