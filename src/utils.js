export const routeTo = (...paths) =>
  "#/" + paths.map(n => n.replace(/ /g, "_")).join("/");

export const decodeRoute = route =>
  route.split("/").map(n => n.replace(/_/g, " "));
