(() => {
  const form = document.querySelector('#editorActivationForm');
  const message = document.querySelector('#activationMessage');
  if (!form || !window.CHIATECH_API) return;
  const token = new URLSearchParams(location.search).get('token') || '';
  const show = (text, kind = '') => { message.textContent = text; message.className = `form-message ${kind}`; };
  if (!token) { form.querySelectorAll('input,button').forEach(element => element.disabled = true); show('This invitation link is incomplete. Ask the Managing Editor to issue a new invitation.', 'error'); return; }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.password.value.length < 12) { show('Choose a password of at least 12 characters.', 'error'); return; }
    if (form.password.value !== form.confirm_password.value) { show('The passwords do not match.', 'error'); return; }
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const response = await window.CHIATECH_API.post({ action: 'activateEditor', inviteToken: token, password: form.password.value });
      if (!response.ok) throw new Error(response.error || 'This invitation could not be activated.');
      form.reset();
      show('Your editor account is active. You may now sign in at the Editorial Desk.', 'success');
    } catch (error) { show(error.message || 'Activation could not be completed.', 'error'); }
    finally { submit.disabled = false; }
  });
})();
