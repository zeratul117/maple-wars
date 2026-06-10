import type { CommanderDefinition, CommanderId } from "../types";

export const commanders: Record<CommanderId, CommanderDefinition> = {
  nova: {
    name: "Dark Lord",
    title: "Shadow Commander",
    portrait: "https://maplestory.io/api/GMS/210.1.1/npc/10203/icon",
    theme: "from-blue-500 to-cyan-300",
    unitStyle: "Blue high-tech army",
    description: "Balanced army with clean movement and reliable armor.",
    passive: "Mechs have +1 movement. Infantry deal 20% more damage. Other units deal 10% less damage.",
    units: { 
      infantry: "https://maplestory.io/api/gms/62/mob/100100/render", 
      mech: "https://maplestory.io/api/gms/62/mob/130101/render", 
      recon: "https://maplestory.io/api/gms/62/mob/1210100/render", 
      tank: "https://maplestory.io/api/gms/62/mob/4230400/render", 
      antiAir: "https://maplestory.io/api/gms/62/mob/4230101/render", 
      copter: "https://maplestory.io/api/gms/62/mob/3230303/render/fly" 
    },
  },
  ember: {
    name: "Athena",
    title: "Crimson Commander",
    portrait: "https://maplestory.io/api/GMS/210.1.1/npc/1012100/icon",
    theme: "from-red-500 to-orange-300",
    unitStyle: "Red assault army",
    description: "Aggressive style with heavy-looking strike units.",
    passive: "Copters deal 10% more damage.",
    units: {
      infantry: "https://maplestory.io/api/gms/62/mob/120100/render",
      mech: "https://maplestory.io/api/gms/62/mob/1210102/render",
      recon: "https://maplestory.io/api/gms/62/mob/2220100/render",
      tank: "https://maplestory.io/api/gms/62/mob/4230103/render",
      antiAir: "https://maplestory.io/api/gms/62/mob/3210800/render",
      copter: "https://maplestory.io/api/gms/62/mob/3210206/render/fly",
    },
  },
  frost: {
    name: "Balrog",
    title: "Demon Commander",
    portrait: "https://maplestory.io/api/GMS/210.1.1/npc/10202/icon",
    theme: "from-indigo-500 to-sky-200",
    unitStyle: "Ice tactical army",
    description: "Cool-toned army focused on defensive visuals.",
    passive: "Tanks take 10% less damage.",
    units: { 
      infantry: "https://maplestory.io/api/gms/62/mob/130100/render", 
      mech: "https://maplestory.io/api/gms/62/mob/1130100/render", 
      recon: "https://maplestory.io/api/gms/62/mob/3230101/render", 
      tank: "https://maplestory.io/api/gms/62/mob/2230102/render", 
      antiAir: "https://maplestory.io/api/gms/62/mob/3230400/render", 
      copter: "https://maplestory.io/api/gms/62/mob/5300100/render/fly" 
    },
  },
};
