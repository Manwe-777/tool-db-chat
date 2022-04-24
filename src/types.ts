// "group-{id}-{owner}-data" (GroupData)
export interface GroupData {
  owners: string[];
  id: string;
  name: string;
  members: string[];
}

// :{address}.group-{id} (Message[])
export interface Message {
  m: string;
  t: number;
  u?: string;
}

export interface MessagesState {
  names: Record<string, string>;
  messages: Record<string, Message[]>;
  groups: string[];
}
