/**
 * Tremor Safelist for Tailwind v4
 *
 * Tremor 组件使用动态生成的 Tailwind 类名（运行时拼接如 bg-${color}-${shade}），
 * 这些类无法被 Tailwind 静态扫描识别。此文件通过包含所有需要的类名字符串，
 * 强制 Tailwind 生成这些样式。
 *
 * 不要删除此文件！Tremor 图表依赖这些类。
 */

// Tremor 使用的所有基础颜色
const colors = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose',
];

// Tremor colorPalette 使用的 shade 值
const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

// ============================================================
// 以下类名用于强制 Tailwind 扫描并生成对应样式
// ============================================================

export const tremorSafelist = `
  bg-slate-50 bg-slate-100 bg-slate-200 bg-slate-300 bg-slate-400 bg-slate-500 bg-slate-600 bg-slate-700 bg-slate-800 bg-slate-900
  bg-gray-50 bg-gray-100 bg-gray-200 bg-gray-300 bg-gray-400 bg-gray-500 bg-gray-600 bg-gray-700 bg-gray-800 bg-gray-900
  bg-zinc-50 bg-zinc-100 bg-zinc-200 bg-zinc-300 bg-zinc-400 bg-zinc-500 bg-zinc-600 bg-zinc-700 bg-zinc-800 bg-zinc-900
  bg-neutral-50 bg-neutral-100 bg-neutral-200 bg-neutral-300 bg-neutral-400 bg-neutral-500 bg-neutral-600 bg-neutral-700 bg-neutral-800 bg-neutral-900
  bg-stone-50 bg-stone-100 bg-stone-200 bg-stone-300 bg-stone-400 bg-stone-500 bg-stone-600 bg-stone-700 bg-stone-800 bg-stone-900
  bg-red-50 bg-red-100 bg-red-200 bg-red-300 bg-red-400 bg-red-500 bg-red-600 bg-red-700 bg-red-800 bg-red-900
  bg-orange-50 bg-orange-100 bg-orange-200 bg-orange-300 bg-orange-400 bg-orange-500 bg-orange-600 bg-orange-700 bg-orange-800 bg-orange-900
  bg-amber-50 bg-amber-100 bg-amber-200 bg-amber-300 bg-amber-400 bg-amber-500 bg-amber-600 bg-amber-700 bg-amber-800 bg-amber-900
  bg-yellow-50 bg-yellow-100 bg-yellow-200 bg-yellow-300 bg-yellow-400 bg-yellow-500 bg-yellow-600 bg-yellow-700 bg-yellow-800 bg-yellow-900
  bg-lime-50 bg-lime-100 bg-lime-200 bg-lime-300 bg-lime-400 bg-lime-500 bg-lime-600 bg-lime-700 bg-lime-800 bg-lime-900
  bg-green-50 bg-green-100 bg-green-200 bg-green-300 bg-green-400 bg-green-500 bg-green-600 bg-green-700 bg-green-800 bg-green-900
  bg-emerald-50 bg-emerald-100 bg-emerald-200 bg-emerald-300 bg-emerald-400 bg-emerald-500 bg-emerald-600 bg-emerald-700 bg-emerald-800 bg-emerald-900
  bg-teal-50 bg-teal-100 bg-teal-200 bg-teal-300 bg-teal-400 bg-teal-500 bg-teal-600 bg-teal-700 bg-teal-800 bg-teal-900
  bg-cyan-50 bg-cyan-100 bg-cyan-200 bg-cyan-300 bg-cyan-400 bg-cyan-500 bg-cyan-600 bg-cyan-700 bg-cyan-800 bg-cyan-900
  bg-sky-50 bg-sky-100 bg-sky-200 bg-sky-300 bg-sky-400 bg-sky-500 bg-sky-600 bg-sky-700 bg-sky-800 bg-sky-900
  bg-blue-50 bg-blue-100 bg-blue-200 bg-blue-300 bg-blue-400 bg-blue-500 bg-blue-600 bg-blue-700 bg-blue-800 bg-blue-900
  bg-indigo-50 bg-indigo-100 bg-indigo-200 bg-indigo-300 bg-indigo-400 bg-indigo-500 bg-indigo-600 bg-indigo-700 bg-indigo-800 bg-indigo-900
  bg-violet-50 bg-violet-100 bg-violet-200 bg-violet-300 bg-violet-400 bg-violet-500 bg-violet-600 bg-violet-700 bg-violet-800 bg-violet-900
  bg-purple-50 bg-purple-100 bg-purple-200 bg-purple-300 bg-purple-400 bg-purple-500 bg-purple-600 bg-purple-700 bg-purple-800 bg-purple-900
  bg-fuchsia-50 bg-fuchsia-100 bg-fuchsia-200 bg-fuchsia-300 bg-fuchsia-400 bg-fuchsia-500 bg-fuchsia-600 bg-fuchsia-700 bg-fuchsia-800 bg-fuchsia-900
  bg-pink-50 bg-pink-100 bg-pink-200 bg-pink-300 bg-pink-400 bg-pink-500 bg-pink-600 bg-pink-700 bg-pink-800 bg-pink-900
  bg-rose-50 bg-rose-100 bg-rose-200 bg-rose-300 bg-rose-400 bg-rose-500 bg-rose-600 bg-rose-700 bg-rose-800 bg-rose-900

  text-slate-50 text-slate-100 text-slate-200 text-slate-300 text-slate-400 text-slate-500 text-slate-600 text-slate-700 text-slate-800 text-slate-900
  text-gray-50 text-gray-100 text-gray-200 text-gray-300 text-gray-400 text-gray-500 text-gray-600 text-gray-700 text-gray-800 text-gray-900
  text-zinc-50 text-zinc-100 text-zinc-200 text-zinc-300 text-zinc-400 text-zinc-500 text-zinc-600 text-zinc-700 text-zinc-800 text-zinc-900
  text-neutral-50 text-neutral-100 text-neutral-200 text-neutral-300 text-neutral-400 text-neutral-500 text-neutral-600 text-neutral-700 text-neutral-800 text-neutral-900
  text-stone-50 text-stone-100 text-stone-200 text-stone-300 text-stone-400 text-stone-500 text-stone-600 text-stone-700 text-stone-800 text-stone-900
  text-red-50 text-red-100 text-red-200 text-red-300 text-red-400 text-red-500 text-red-600 text-red-700 text-red-800 text-red-900
  text-orange-50 text-orange-100 text-orange-200 text-orange-300 text-orange-400 text-orange-500 text-orange-600 text-orange-700 text-orange-800 text-orange-900
  text-amber-50 text-amber-100 text-amber-200 text-amber-300 text-amber-400 text-amber-500 text-amber-600 text-amber-700 text-amber-800 text-amber-900
  text-yellow-50 text-yellow-100 text-yellow-200 text-yellow-300 text-yellow-400 text-yellow-500 text-yellow-600 text-yellow-700 text-yellow-800 text-yellow-900
  text-lime-50 text-lime-100 text-lime-200 text-lime-300 text-lime-400 text-lime-500 text-lime-600 text-lime-700 text-lime-800 text-lime-900
  text-green-50 text-green-100 text-green-200 text-green-300 text-green-400 text-green-500 text-green-600 text-green-700 text-green-800 text-green-900
  text-emerald-50 text-emerald-100 text-emerald-200 text-emerald-300 text-emerald-400 text-emerald-500 text-emerald-600 text-emerald-700 text-emerald-800 text-emerald-900
  text-teal-50 text-teal-100 text-teal-200 text-teal-300 text-teal-400 text-teal-500 text-teal-600 text-teal-700 text-teal-800 text-teal-900
  text-cyan-50 text-cyan-100 text-cyan-200 text-cyan-300 text-cyan-400 text-cyan-500 text-cyan-600 text-cyan-700 text-cyan-800 text-cyan-900
  text-sky-50 text-sky-100 text-sky-200 text-sky-300 text-sky-400 text-sky-500 text-sky-600 text-sky-700 text-sky-800 text-sky-900
  text-blue-50 text-blue-100 text-blue-200 text-blue-300 text-blue-400 text-blue-500 text-blue-600 text-blue-700 text-blue-800 text-blue-900
  text-indigo-50 text-indigo-100 text-indigo-200 text-indigo-300 text-indigo-400 text-indigo-500 text-indigo-600 text-indigo-700 text-indigo-800 text-indigo-900
  text-violet-50 text-violet-100 text-violet-200 text-violet-300 text-violet-400 text-violet-500 text-violet-600 text-violet-700 text-violet-800 text-violet-900
  text-purple-50 text-purple-100 text-purple-200 text-purple-300 text-purple-400 text-purple-500 text-purple-600 text-purple-700 text-purple-800 text-purple-900
  text-fuchsia-50 text-fuchsia-100 text-fuchsia-200 text-fuchsia-300 text-fuchsia-400 text-fuchsia-500 text-fuchsia-600 text-fuchsia-700 text-fuchsia-800 text-fuchsia-900
  text-pink-50 text-pink-100 text-pink-200 text-pink-300 text-pink-400 text-pink-500 text-pink-600 text-pink-700 text-pink-800 text-pink-900
  text-rose-50 text-rose-100 text-rose-200 text-rose-300 text-rose-400 text-rose-500 text-rose-600 text-rose-700 text-rose-800 text-rose-900

  stroke-slate-50 stroke-slate-100 stroke-slate-200 stroke-slate-300 stroke-slate-400 stroke-slate-500 stroke-slate-600 stroke-slate-700 stroke-slate-800 stroke-slate-900
  stroke-gray-50 stroke-gray-100 stroke-gray-200 stroke-gray-300 stroke-gray-400 stroke-gray-500 stroke-gray-600 stroke-gray-700 stroke-gray-800 stroke-gray-900
  stroke-zinc-50 stroke-zinc-100 stroke-zinc-200 stroke-zinc-300 stroke-zinc-400 stroke-zinc-500 stroke-zinc-600 stroke-zinc-700 stroke-zinc-800 stroke-zinc-900
  stroke-neutral-50 stroke-neutral-100 stroke-neutral-200 stroke-neutral-300 stroke-neutral-400 stroke-neutral-500 stroke-neutral-600 stroke-neutral-700 stroke-neutral-800 stroke-neutral-900
  stroke-stone-50 stroke-stone-100 stroke-stone-200 stroke-stone-300 stroke-stone-400 stroke-stone-500 stroke-stone-600 stroke-stone-700 stroke-stone-800 stroke-stone-900
  stroke-red-50 stroke-red-100 stroke-red-200 stroke-red-300 stroke-red-400 stroke-red-500 stroke-red-600 stroke-red-700 stroke-red-800 stroke-red-900
  stroke-orange-50 stroke-orange-100 stroke-orange-200 stroke-orange-300 stroke-orange-400 stroke-orange-500 stroke-orange-600 stroke-orange-700 stroke-orange-800 stroke-orange-900
  stroke-amber-50 stroke-amber-100 stroke-amber-200 stroke-amber-300 stroke-amber-400 stroke-amber-500 stroke-amber-600 stroke-amber-700 stroke-amber-800 stroke-amber-900
  stroke-yellow-50 stroke-yellow-100 stroke-yellow-200 stroke-yellow-300 stroke-yellow-400 stroke-yellow-500 stroke-yellow-600 stroke-yellow-700 stroke-yellow-800 stroke-yellow-900
  stroke-lime-50 stroke-lime-100 stroke-lime-200 stroke-lime-300 stroke-lime-400 stroke-lime-500 stroke-lime-600 stroke-lime-700 stroke-lime-800 stroke-lime-900
  stroke-green-50 stroke-green-100 stroke-green-200 stroke-green-300 stroke-green-400 stroke-green-500 stroke-green-600 stroke-green-700 stroke-green-800 stroke-green-900
  stroke-emerald-50 stroke-emerald-100 stroke-emerald-200 stroke-emerald-300 stroke-emerald-400 stroke-emerald-500 stroke-emerald-600 stroke-emerald-700 stroke-emerald-800 stroke-emerald-900
  stroke-teal-50 stroke-teal-100 stroke-teal-200 stroke-teal-300 stroke-teal-400 stroke-teal-500 stroke-teal-600 stroke-teal-700 stroke-teal-800 stroke-teal-900
  stroke-cyan-50 stroke-cyan-100 stroke-cyan-200 stroke-cyan-300 stroke-cyan-400 stroke-cyan-500 stroke-cyan-600 stroke-cyan-700 stroke-cyan-800 stroke-cyan-900
  stroke-sky-50 stroke-sky-100 stroke-sky-200 stroke-sky-300 stroke-sky-400 stroke-sky-500 stroke-sky-600 stroke-sky-700 stroke-sky-800 stroke-sky-900
  stroke-blue-50 stroke-blue-100 stroke-blue-200 stroke-blue-300 stroke-blue-400 stroke-blue-500 stroke-blue-600 stroke-blue-700 stroke-blue-800 stroke-blue-900
  stroke-indigo-50 stroke-indigo-100 stroke-indigo-200 stroke-indigo-300 stroke-indigo-400 stroke-indigo-500 stroke-indigo-600 stroke-indigo-700 stroke-indigo-800 stroke-indigo-900
  stroke-violet-50 stroke-violet-100 stroke-violet-200 stroke-violet-300 stroke-violet-400 stroke-violet-500 stroke-violet-600 stroke-violet-700 stroke-violet-800 stroke-violet-900
  stroke-purple-50 stroke-purple-100 stroke-purple-200 stroke-purple-300 stroke-purple-400 stroke-purple-500 stroke-purple-600 stroke-purple-700 stroke-purple-800 stroke-purple-900
  stroke-fuchsia-50 stroke-fuchsia-100 stroke-fuchsia-200 stroke-fuchsia-300 stroke-fuchsia-400 stroke-fuchsia-500 stroke-fuchsia-600 stroke-fuchsia-700 stroke-fuchsia-800 stroke-fuchsia-900
  stroke-pink-50 stroke-pink-100 stroke-pink-200 stroke-pink-300 stroke-pink-400 stroke-pink-500 stroke-pink-600 stroke-pink-700 stroke-pink-800 stroke-pink-900
  stroke-rose-50 stroke-rose-100 stroke-rose-200 stroke-rose-300 stroke-rose-400 stroke-rose-500 stroke-rose-600 stroke-rose-700 stroke-rose-800 stroke-rose-900

  fill-slate-50 fill-slate-100 fill-slate-200 fill-slate-300 fill-slate-400 fill-slate-500 fill-slate-600 fill-slate-700 fill-slate-800 fill-slate-900
  fill-gray-50 fill-gray-100 fill-gray-200 fill-gray-300 fill-gray-400 fill-gray-500 fill-gray-600 fill-gray-700 fill-gray-800 fill-gray-900
  fill-zinc-50 fill-zinc-100 fill-zinc-200 fill-zinc-300 fill-zinc-400 fill-zinc-500 fill-zinc-600 fill-zinc-700 fill-zinc-800 fill-zinc-900
  fill-neutral-50 fill-neutral-100 fill-neutral-200 fill-neutral-300 fill-neutral-400 fill-neutral-500 fill-neutral-600 fill-neutral-700 fill-neutral-800 fill-neutral-900
  fill-stone-50 fill-stone-100 fill-stone-200 fill-stone-300 fill-stone-400 fill-stone-500 fill-stone-600 fill-stone-700 fill-stone-800 fill-stone-900
  fill-red-50 fill-red-100 fill-red-200 fill-red-300 fill-red-400 fill-red-500 fill-red-600 fill-red-700 fill-red-800 fill-red-900
  fill-orange-50 fill-orange-100 fill-orange-200 fill-orange-300 fill-orange-400 fill-orange-500 fill-orange-600 fill-orange-700 fill-orange-800 fill-orange-900
  fill-amber-50 fill-amber-100 fill-amber-200 fill-amber-300 fill-amber-400 fill-amber-500 fill-amber-600 fill-amber-700 fill-amber-800 fill-amber-900
  fill-yellow-50 fill-yellow-100 fill-yellow-200 fill-yellow-300 fill-yellow-400 fill-yellow-500 fill-yellow-600 fill-yellow-700 fill-yellow-800 fill-yellow-900
  fill-lime-50 fill-lime-100 fill-lime-200 fill-lime-300 fill-lime-400 fill-lime-500 fill-lime-600 fill-lime-700 fill-lime-800 fill-lime-900
  fill-green-50 fill-green-100 fill-green-200 fill-green-300 fill-green-400 fill-green-500 fill-green-600 fill-green-700 fill-green-800 fill-green-900
  fill-emerald-50 fill-emerald-100 fill-emerald-200 fill-emerald-300 fill-emerald-400 fill-emerald-500 fill-emerald-600 fill-emerald-700 fill-emerald-800 fill-emerald-900
  fill-teal-50 fill-teal-100 fill-teal-200 fill-teal-300 fill-teal-400 fill-teal-500 fill-teal-600 fill-teal-700 fill-teal-800 fill-teal-900
  fill-cyan-50 fill-cyan-100 fill-cyan-200 fill-cyan-300 fill-cyan-400 fill-cyan-500 fill-cyan-600 fill-cyan-700 fill-cyan-800 fill-cyan-900
  fill-sky-50 fill-sky-100 fill-sky-200 fill-sky-300 fill-sky-400 fill-sky-500 fill-sky-600 fill-sky-700 fill-sky-800 fill-sky-900
  fill-blue-50 fill-blue-100 fill-blue-200 fill-blue-300 fill-blue-400 fill-blue-500 fill-blue-600 fill-blue-700 fill-blue-800 fill-blue-900
  fill-indigo-50 fill-indigo-100 fill-indigo-200 fill-indigo-300 fill-indigo-400 fill-indigo-500 fill-indigo-600 fill-indigo-700 fill-indigo-800 fill-indigo-900
  fill-violet-50 fill-violet-100 fill-violet-200 fill-violet-300 fill-violet-400 fill-violet-500 fill-violet-600 fill-violet-700 fill-violet-800 fill-violet-900
  fill-purple-50 fill-purple-100 fill-purple-200 fill-purple-300 fill-purple-400 fill-purple-500 fill-purple-600 fill-purple-700 fill-purple-800 fill-purple-900
  fill-fuchsia-50 fill-fuchsia-100 fill-fuchsia-200 fill-fuchsia-300 fill-fuchsia-400 fill-fuchsia-500 fill-fuchsia-600 fill-fuchsia-700 fill-fuchsia-800 fill-fuchsia-900
  fill-pink-50 fill-pink-100 fill-pink-200 fill-pink-300 fill-pink-400 fill-pink-500 fill-pink-600 fill-pink-700 fill-pink-800 fill-pink-900
  fill-rose-50 fill-rose-100 fill-rose-200 fill-rose-300 fill-rose-400 fill-rose-500 fill-rose-600 fill-rose-700 fill-rose-800 fill-rose-900

  border-slate-50 border-slate-100 border-slate-200 border-slate-300 border-slate-400 border-slate-500 border-slate-600 border-slate-700 border-slate-800 border-slate-900
  border-gray-50 border-gray-100 border-gray-200 border-gray-300 border-gray-400 border-gray-500 border-gray-600 border-gray-700 border-gray-800 border-gray-900
  border-zinc-50 border-zinc-100 border-zinc-200 border-zinc-300 border-zinc-400 border-zinc-500 border-zinc-600 border-zinc-700 border-zinc-800 border-zinc-900
  border-neutral-50 border-neutral-100 border-neutral-200 border-neutral-300 border-neutral-400 border-neutral-500 border-neutral-600 border-neutral-700 border-neutral-800 border-neutral-900
  border-stone-50 border-stone-100 border-stone-200 border-stone-300 border-stone-400 border-stone-500 border-stone-600 border-stone-700 border-stone-800 border-stone-900
  border-red-50 border-red-100 border-red-200 border-red-300 border-red-400 border-red-500 border-red-600 border-red-700 border-red-800 border-red-900
  border-orange-50 border-orange-100 border-orange-200 border-orange-300 border-orange-400 border-orange-500 border-orange-600 border-orange-700 border-orange-800 border-orange-900
  border-amber-50 border-amber-100 border-amber-200 border-amber-300 border-amber-400 border-amber-500 border-amber-600 border-amber-700 border-amber-800 border-amber-900
  border-yellow-50 border-yellow-100 border-yellow-200 border-yellow-300 border-yellow-400 border-yellow-500 border-yellow-600 border-yellow-700 border-yellow-800 border-yellow-900
  border-lime-50 border-lime-100 border-lime-200 border-lime-300 border-lime-400 border-lime-500 border-lime-600 border-lime-700 border-lime-800 border-lime-900
  border-green-50 border-green-100 border-green-200 border-green-300 border-green-400 border-green-500 border-green-600 border-green-700 border-green-800 border-green-900
  border-emerald-50 border-emerald-100 border-emerald-200 border-emerald-300 border-emerald-400 border-emerald-500 border-emerald-600 border-emerald-700 border-emerald-800 border-emerald-900
  border-teal-50 border-teal-100 border-teal-200 border-teal-300 border-teal-400 border-teal-500 border-teal-600 border-teal-700 border-teal-800 border-teal-900
  border-cyan-50 border-cyan-100 border-cyan-200 border-cyan-300 border-cyan-400 border-cyan-500 border-cyan-600 border-cyan-700 border-cyan-800 border-cyan-900
  border-sky-50 border-sky-100 border-sky-200 border-sky-300 border-sky-400 border-sky-500 border-sky-600 border-sky-700 border-sky-800 border-sky-900
  border-blue-50 border-blue-100 border-blue-200 border-blue-300 border-blue-400 border-blue-500 border-blue-600 border-blue-700 border-blue-800 border-blue-900
  border-indigo-50 border-indigo-100 border-indigo-200 border-indigo-300 border-indigo-400 border-indigo-500 border-indigo-600 border-indigo-700 border-indigo-800 border-indigo-900
  border-violet-50 border-violet-100 border-violet-200 border-violet-300 border-violet-400 border-violet-500 border-violet-600 border-violet-700 border-violet-800 border-violet-900
  border-purple-50 border-purple-100 border-purple-200 border-purple-300 border-purple-400 border-purple-500 border-purple-600 border-purple-700 border-purple-800 border-purple-900
  border-fuchsia-50 border-fuchsia-100 border-fuchsia-200 border-fuchsia-300 border-fuchsia-400 border-fuchsia-500 border-fuchsia-600 border-fuchsia-700 border-fuchsia-800 border-fuchsia-900
  border-pink-50 border-pink-100 border-pink-200 border-pink-300 border-pink-400 border-pink-500 border-pink-600 border-pink-700 border-pink-800 border-pink-900
  border-rose-50 border-rose-100 border-rose-200 border-rose-300 border-rose-400 border-rose-500 border-rose-600 border-rose-700 border-rose-800 border-rose-900

  ring-slate-50 ring-slate-100 ring-slate-200 ring-slate-300 ring-slate-400 ring-slate-500 ring-slate-600 ring-slate-700 ring-slate-800 ring-slate-900
  ring-gray-50 ring-gray-100 ring-gray-200 ring-gray-300 ring-gray-400 ring-gray-500 ring-gray-600 ring-gray-700 ring-gray-800 ring-gray-900
  ring-zinc-50 ring-zinc-100 ring-zinc-200 ring-zinc-300 ring-zinc-400 ring-zinc-500 ring-zinc-600 ring-zinc-700 ring-zinc-800 ring-zinc-900
  ring-neutral-50 ring-neutral-100 ring-neutral-200 ring-neutral-300 ring-neutral-400 ring-neutral-500 ring-neutral-600 ring-neutral-700 ring-neutral-800 ring-neutral-900
  ring-stone-50 ring-stone-100 ring-stone-200 ring-stone-300 ring-stone-400 ring-stone-500 ring-stone-600 ring-stone-700 ring-stone-800 ring-stone-900
  ring-red-50 ring-red-100 ring-red-200 ring-red-300 ring-red-400 ring-red-500 ring-red-600 ring-red-700 ring-red-800 ring-red-900
  ring-orange-50 ring-orange-100 ring-orange-200 ring-orange-300 ring-orange-400 ring-orange-500 ring-orange-600 ring-orange-700 ring-orange-800 ring-orange-900
  ring-amber-50 ring-amber-100 ring-amber-200 ring-amber-300 ring-amber-400 ring-amber-500 ring-amber-600 ring-amber-700 ring-amber-800 ring-amber-900
  ring-yellow-50 ring-yellow-100 ring-yellow-200 ring-yellow-300 ring-yellow-400 ring-yellow-500 ring-yellow-600 ring-yellow-700 ring-yellow-800 ring-yellow-900
  ring-lime-50 ring-lime-100 ring-lime-200 ring-lime-300 ring-lime-400 ring-lime-500 ring-lime-600 ring-lime-700 ring-lime-800 ring-lime-900
  ring-green-50 ring-green-100 ring-green-200 ring-green-300 ring-green-400 ring-green-500 ring-green-600 ring-green-700 ring-green-800 ring-green-900
  ring-emerald-50 ring-emerald-100 ring-emerald-200 ring-emerald-300 ring-emerald-400 ring-emerald-500 ring-emerald-600 ring-emerald-700 ring-emerald-800 ring-emerald-900
  ring-teal-50 ring-teal-100 ring-teal-200 ring-teal-300 ring-teal-400 ring-teal-500 ring-teal-600 ring-teal-700 ring-teal-800 ring-teal-900
  ring-cyan-50 ring-cyan-100 ring-cyan-200 ring-cyan-300 ring-cyan-400 ring-cyan-500 ring-cyan-600 ring-cyan-700 ring-cyan-800 ring-cyan-900
  ring-sky-50 ring-sky-100 ring-sky-200 ring-sky-300 ring-sky-400 ring-sky-500 ring-sky-600 ring-sky-700 ring-sky-800 ring-sky-900
  ring-blue-50 ring-blue-100 ring-blue-200 ring-blue-300 ring-blue-400 ring-blue-500 ring-blue-600 ring-blue-700 ring-blue-800 ring-blue-900
  ring-indigo-50 ring-indigo-100 ring-indigo-200 ring-indigo-300 ring-indigo-400 ring-indigo-500 ring-indigo-600 ring-indigo-700 ring-indigo-800 ring-indigo-900
  ring-violet-50 ring-violet-100 ring-violet-200 ring-violet-300 ring-violet-400 ring-violet-500 ring-violet-600 ring-violet-700 ring-violet-800 ring-violet-900
  ring-purple-50 ring-purple-100 ring-purple-200 ring-purple-300 ring-purple-400 ring-purple-500 ring-purple-600 ring-purple-700 ring-purple-800 ring-purple-900
  ring-fuchsia-50 ring-fuchsia-100 ring-fuchsia-200 ring-fuchsia-300 ring-fuchsia-400 ring-fuchsia-500 ring-fuchsia-600 ring-fuchsia-700 ring-fuchsia-800 ring-fuchsia-900
  ring-pink-50 ring-pink-100 ring-pink-200 ring-pink-300 ring-pink-400 ring-pink-500 ring-pink-600 ring-pink-700 ring-pink-800 ring-pink-900
  ring-rose-50 ring-rose-100 ring-rose-200 ring-rose-300 ring-rose-400 ring-rose-500 ring-rose-600 ring-rose-700 ring-rose-800 ring-rose-900

  hover:bg-slate-50 hover:bg-slate-100 hover:bg-slate-200 hover:bg-slate-300 hover:bg-slate-400 hover:bg-slate-500 hover:bg-slate-600 hover:bg-slate-700 hover:bg-slate-800 hover:bg-slate-900
  hover:bg-gray-50 hover:bg-gray-100 hover:bg-gray-200 hover:bg-gray-300 hover:bg-gray-400 hover:bg-gray-500 hover:bg-gray-600 hover:bg-gray-700 hover:bg-gray-800 hover:bg-gray-900
  hover:bg-red-50 hover:bg-red-100 hover:bg-red-200 hover:bg-red-300 hover:bg-red-400 hover:bg-red-500 hover:bg-red-600 hover:bg-red-700 hover:bg-red-800 hover:bg-red-900
  hover:bg-blue-50 hover:bg-blue-100 hover:bg-blue-200 hover:bg-blue-300 hover:bg-blue-400 hover:bg-blue-500 hover:bg-blue-600 hover:bg-blue-700 hover:bg-blue-800 hover:bg-blue-900
  hover:bg-indigo-50 hover:bg-indigo-100 hover:bg-indigo-200 hover:bg-indigo-300 hover:bg-indigo-400 hover:bg-indigo-500 hover:bg-indigo-600 hover:bg-indigo-700 hover:bg-indigo-800 hover:bg-indigo-900
  hover:bg-emerald-50 hover:bg-emerald-100 hover:bg-emerald-200 hover:bg-emerald-300 hover:bg-emerald-400 hover:bg-emerald-500 hover:bg-emerald-600 hover:bg-emerald-700 hover:bg-emerald-800 hover:bg-emerald-900
`;
