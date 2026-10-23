function initContact() {
  const form = document.querySelector('#sentrapedia-contact form');
  if (form) {
    const submit = form.querySelector('[type="submit"]');
    const status = form.querySelector('.contact-status');
    form.addEventListener('invalid', () => {
      form.dataset.attempted = 'true';
      status.dataset.state = 'error';
      status.textContent = 'Periksa kolom wajib dan alamat email sebelum mengirim.';
    }, true);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity() || submit.disabled) return;

      submit.disabled = true;
      submit.value = 'Mengirim…';
      status.dataset.state = 'sending';
      status.textContent = 'Sedang mengirim pesan…';
      try {
        const fields = new FormData(form);
        const response = await fetch(form.action, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fields.get('your-name'),
            email: fields.get('your-email'),
            company: fields.get('company') || '',
            phone: fields.get('phone') || '',
            message: fields.get('message'),
            website: fields.get('website') || '',
            consent: fields.get('acceptance-0') === '1'
          })
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'accepted') throw new Error(result.message || 'Layanan pengiriman belum tersedia.');
        form.reset();
        delete form.dataset.attempted;
        status.dataset.state = 'success';
        status.textContent = 'Pesan diterima oleh layanan pengiriman. Terima kasih.';
      } catch (error) {
        status.dataset.state = 'error';
        status.textContent = `Pesan belum terkirim. ${error.message || 'Periksa kembali nanti.'}`;
      } finally {
        submit.disabled = false;
        submit.value = 'Kirim';
      }
    });
  }

}
