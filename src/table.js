export default function table(path, convert) {
  return (_, store) => {
    return store.load(path, convert).then(values => [{ values }]);
  };
}
