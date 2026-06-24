import { Terminal } from "lucide-react";

type Command = { cmd: string; desc: string };

const DEFAULT_COMMANDS: Command[] = [
  { cmd: "!kick @user", desc: "Kick a user from the room (admin only)." },
  { cmd: "!ban @user", desc: "Ban a user from the room (admin only)." },
  { cmd: "!mute @user", desc: "Mute a user." },
  { cmd: "!unmute @user", desc: "Unmute a user." },
  { cmd: "!warn @user", desc: "Send a warning to a user." },
  { cmd: "!welcome on/off", desc: "Toggle welcome messages." },
  { cmd: "!bye on/off", desc: "Toggle leave messages." },
  { cmd: "!admin @user", desc: "Promote a user to bot admin." },
  { cmd: "!deladmin @user", desc: "Remove a user from bot admins." },
  { cmd: "!setpos", desc: "Set the bot's room position to your current location." },
  { cmd: "!help", desc: "Show the full command list in-room." },
];

export function CommandsCard({ commands = DEFAULT_COMMANDS }: { commands?: Command[] }) {
  return (
    <div className="glass-strong rounded-3xl p-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Terminal className="size-4 text-accent" /> Bot Commands
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Quick reference of every command the bot supports inside Highrise.
      </p>
      <ul className="mt-4 grid gap-2">
        {commands.map((c) => (
          <li
            key={c.cmd}
            className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <code className="font-mono text-sm text-accent">{c.cmd}</code>
            <span className="text-xs text-muted-foreground">{c.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
