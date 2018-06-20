export default function table(path, map) {
  return (_, store) => {
    return store.load(path, map).then(values => [{ values }]);
  };
}
