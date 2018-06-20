export default function table(path, map) {
  return (_, store) => {
    return store.fetch(path, map).then(values => [{ values }]);
  };
}
