const store = (globalThis.browser ?? chrome).storage.local;
store.get({enabled:true, mode:'auto', style:true}).then(prefs => {
  for (const [id, value] of Object.entries(prefs)) {
    const input = document.getElementById(id);
    const property = input.type === 'checkbox' ? 'checked' : 'value';
    input[property] = value;
    input.addEventListener('change', () => store.set({[id]:input[property]}));
  }
});

