export const VIS = [];
export const VMAP = {};

export const def = (id, name, group, params, draw, init) => {
  const v = { id, name, group, params, draw, init };
  VIS.push(v);
  VMAP[id] = v;
};
