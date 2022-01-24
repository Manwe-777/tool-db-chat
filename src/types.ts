// "group-{id}-{owner}-data" (GroupData)
export interface GroupData {
  owner: string;
  id: string;
  name: string;
  members: string[];
}

// :{pubkey}.group-{id} (Message[])
export interface Message {
  message: string;
  timestamp: number;
  username?: string;
}

export interface MessagesState {
  names: Record<string, string>;
  messages: Record<string, Message[]>;
  groups: string[];
}
