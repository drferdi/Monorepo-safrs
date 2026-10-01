/**
 * A synthetic resep page shaped like the live ePuskesmas one, as read on 2026-10-01 (jQuery UI
 * 1.12.1 autocompletes, read-only): one entry row whose "Nama Obat" and "Cari Resep Signa"
 * autocompletes write the hidden `obat_id`, `stok_obat` and `obat_signa` only when a suggestion is
 * chosen; Tambah (`setTambahObat`) refuses the row while any of them is missing and otherwise
 * appends it to `#tabel_detail` as `tr_<x>` (x = rows + 1; the entry row is the first `tr` of
 * `#tabel_detail`) carrying hidden `ResepDetail[x][...]` inputs and no `obat_nama`, then clears
 * the entry row (`resetForm`). Typing alone selects nothing. The `$` here implements only what the
 * extension's main-world bridge calls. Synthetic data only.
 */
export function buildEpuskesmasShapedResepPage(): string {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>e-Puskesmas - Resep - Buat Baru (synthetic)</title>
      </head>
      <body>
        <form id="synthetic-resep-form">
          <label>No Resep <input name="no_resep" /></label>
          <label>Alergi <textarea name="alergi"></textarea></label>
          <label>Prioritas
            <select name="prioritas">
              <option value="">-</option>
              <option value="0">Tidak</option>
              <option value="1">Ya</option>
            </select>
          </label>
          <label>Dokter <input name="dokter_nama_bpjs" /></label>
          <label>Perawat <input name="perawat_nama" /></label>

          <div class="box">
            <h3>Resep</h3>
            <table class="table table-bordered">
              <thead>
                <tr>
                  <th>Racikan</th><th>Jumlah Permintaan</th><th>Nama Obat</th><th>Jumlah</th>
                  <th>Signa</th><th>Aturan Pakai</th><th>Keterangan</th>
                </tr>
              </thead>
              <tbody id="tabel_detail">
                <tr id="entry-row">
                  <td>
                    <select name="ResepDetail[1][obat_racikan]" data-for="obat_racikan">
                      <option value="0">Non-racikan</option>
                      <option value="1">Racikan</option>
                    </select>
                  </td>
                  <td><input type="number" name="ResepDetail[1][obat_jumlah_permintaan]" data-for="obat_jumlah_permintaan" /></td>
                  <td>
                    <input type="text" name="ResepDetail[1][obat_id]" data-for="obat_id" style="display:none" />
                    <input type="text" name="stok_obat" data-for="stok_obat" style="display:none" />
                    <input type="text" name="obat_nama" data-for="obat_nama" placeholder="🔍 Nama Obat" autocomplete="off" />
                  </td>
                  <td><input type="number" name="ResepDetail[1][obat_jumlah]" data-for="obat_jumlah" /></td>
                  <td>
                    <input type="text" name="ResepDetail[1][obat_signa]" data-for="obat_signa" style="display:none" />
                    <input type="text" name="signa_nama" data-for="signa_nama" placeholder="🔍 Cari Resep Signa" autocomplete="off" />
                  </td>
                  <td>
                    <select name="ResepDetail[1][aturan_pakai]" data-for="aturan_pakai">
                      <option value="">-</option>
                      <option value="1">Sebelum Makan</option>
                      <option value="2">Sesudah Makan</option>
                      <option value="3">Pemakaian Luar</option>
                      <option value="4">Jika Diperlukan</option>
                      <option value="5">Saat Makan</option>
                    </select>
                  </td>
                  <td><input type="text" name="ResepDetail[1][obat_keterangan]" data-for="obat_keterangan" /></td>
                </tr>
              </tbody>
            </table>
            <button id="button_add_obat" type="button" class="btn btn-sm btn-primary">Tambah</button>
          </div>
        </form>
        <div id="page-alerts"></div>

        <script>
          (function () {
            var instances = new WeakMap();

            function wrap(elements) {
              var api = {
                length: elements.length,
                toArray: function () { return elements.slice(); },
                eq: function (index) { return wrap(elements[index] ? [elements[index]] : []); },
                first: function () { return wrap(elements.slice(0, 1)); },
                each: function (callback) {
                  for (var i = 0; i < elements.length; i++) {
                    if (callback.call(elements[i], i, elements[i]) === false) break;
                  }
                  return api;
                },
                find: function (selector) {
                  var found = [];
                  elements.forEach(function (element) {
                    found = found.concat(Array.from(element.querySelectorAll(selector)));
                  });
                  return wrap(found);
                },
                text: function () {
                  return elements.map(function (element) { return element.textContent || ''; }).join('');
                },
                val: function (value) {
                  if (arguments.length === 0) {
                    var first = elements[0];
                    return first && 'value' in first ? first.value : undefined;
                  }
                  elements.forEach(function (element) { if ('value' in element) element.value = value; });
                  return api;
                },
                data: function (key) {
                  var first = elements[0];
                  if (!first || (key !== 'ui-autocomplete' && key !== 'uiAutocomplete')) return undefined;
                  return instances.get(first);
                },
                autocomplete: function (command, term) {
                  var instance = elements[0] && instances.get(elements[0]);
                  if (instance && command === 'search') instance.search(term);
                  return api;
                },
                trigger: function (eventName) {
                  elements.forEach(function (element) {
                    element.dispatchEvent(new Event(eventName, { bubbles: true }));
                  });
                  return api;
                },
              };
              return api;
            }

            function $(selector) {
              if (typeof selector === 'string') {
                var visibleOnly = selector.indexOf(':visible') >= 0;
                var elements = Array.from(document.querySelectorAll(selector.replace(/:visible/g, '')));
                if (visibleOnly) {
                  elements = elements.filter(function (element) { return element.getClientRects().length > 0; });
                }
                return wrap(elements);
              }
              if (selector instanceof Element) return wrap([selector]);
              return wrap([]);
            }
            window.$ = $;
            window.jQuery = $;

            function field(name) { return document.querySelector('[data-for="' + name + '"]'); }

            // jQuery UI autocomplete as the live page uses it: search after a 1000 ms pause in typing,
            // at once on ArrowDown; choosing an item (click) runs the page's select; blur closes the
            // menu and drops a pending search.
            function autocomplete(input, options) {
              var menu = document.createElement('ul');
              menu.className = 'ui-menu ui-widget ui-widget-content ui-autocomplete ui-front';
              menu.style.cssText = 'display:none;position:absolute;background:#fff;list-style:none;margin:0;padding:0';
              document.body.appendChild(menu);
              var pending = null;
              var instance = {
                search: function (term) {
                  var query = String(term == null ? input.value : term).toLowerCase();
                  var items = options.catalog.filter(function (item) {
                    return item.value.toLowerCase().indexOf(query) >= 0;
                  });
                  menu.innerHTML = '';
                  items.forEach(function (item) {
                    var li = document.createElement('li');
                    li.className = 'ui-menu-item';
                    var wrapper = document.createElement('div');
                    wrapper.className = 'ui-menu-item-wrapper';
                    wrapper.textContent = item.label;
                    li.appendChild(wrapper);
                    li.__item = item;
                    menu.appendChild(li);
                  });
                  var rect = input.getBoundingClientRect();
                  menu.style.left = rect.left + 'px';
                  menu.style.top = rect.bottom + window.scrollY + 'px';
                  menu.style.display = items.length ? 'block' : 'none';
                },
              };
              instances.set(input, instance);
              input.classList.add('ui-autocomplete-input');
              input.addEventListener('input', function () {
                clearTimeout(pending);
                pending = setTimeout(function () { instance.search(input.value); }, 1000);
              });
              input.addEventListener('keydown', function (event) {
                if (event.keyCode === 40 && menu.style.display === 'none') instance.search(input.value);
              });
              input.addEventListener('blur', function () {
                clearTimeout(pending);
                setTimeout(function () { menu.style.display = 'none'; }, 150);
              });
              menu.addEventListener('click', function (event) {
                var li = event.target.closest('.ui-menu-item');
                if (!li) return;
                input.value = li.__item.value;
                menu.style.display = 'none';
                options.select(li.__item);
              });
            }

            autocomplete(field('obat_nama'), {
              catalog: [
                { id: '20011', label: '20011 - Amoksisilin sirup 125 mg/5 ml (40)', value: 'Amoksisilin sirup 125 mg/5 ml', stok: '40' },
                { id: '20012', label: '20012 - Amoksisilin kapsul/kaplet 500 mg (832)', value: 'Amoksisilin kapsul/kaplet 500 mg', stok: '832' },
                { id: '30001', label: '30001 - Parasetamol tablet 500 mg (900)', value: 'Parasetamol tablet 500 mg', stok: '900' },
                { id: '20144', label: '20144 - N-asetilsistein kapsul 200 mg (1427)', value: 'N-asetilsistein kapsul 200 mg', stok: '1427' },
                { id: '20109', label: '20109 - Klorfeniramin Maleat ( CTM ) tablet 4 mg (1051)', value: 'Klorfeniramin Maleat ( CTM ) tablet 4 mg', stok: '1051' },
              ],
              select: function (item) {
                field('obat_id').value = item.id;
                field('stok_obat').value = item.stok;
              },
            });
            autocomplete(field('signa_nama'), {
              catalog: ['3X1', '3X1/3', '3X1,5', '3X1/6', '3X1/2', '2X1', '1X1'].map(function (value, index) {
                return { id: String(index + 1), label: value, value: value };
              }),
              select: function (item) { field('obat_signa').value = item.value; },
            });

            function pageAlert(message) {
              var box = document.createElement('div');
              box.className = 'alert alert-warning';
              box.textContent = message;
              document.getElementById('page-alerts').appendChild(box);
              return false;
            }

            // setTambahObat as read on the live page (order of its checks kept).
            document.getElementById('button_add_obat').addEventListener('click', function () {
              var obatId = field('obat_id').value;
              var jumlah = field('obat_jumlah').value;
              var signa = field('obat_signa').value;
              if (obatId && parseFloat(field('stok_obat').value) < parseFloat(jumlah)) {
                return pageAlert('Stok Obat ' + field('obat_nama').value + ' tidak mencukupi!');
              }
              if (obatId === '') return pageAlert('Nama obat tidak boleh kosong');
              if (jumlah === '' || Number(jumlah) < 0) return pageAlert('Jumlah obat tidak boleh kosong atau minus');
              if (signa === '') return pageAlert('Signa tidak boleh kosong');
              var detail = document.getElementById('tabel_detail');
              var x = detail.children.length + 1;
              var row = document.createElement('tr');
              row.id = 'tr_' + x;
              row.className = 'resep-detail-row';
              row.dataset.obatId = obatId;
              row.dataset.signa = signa;
              row.dataset.jumlah = jumlah;
              row.dataset.aturanPakai = field('aturan_pakai').value;
              var nameCell = document.createElement('td');
              nameCell.textContent = field('obat_nama').value;
              row.appendChild(nameCell);
              [
                ['obat_racikan', field('obat_racikan').value],
                ['obat_jumlah_permintaan', field('obat_jumlah_permintaan').value],
                ['obat_id', obatId],
                ['obat_jumlah', jumlah],
                ['obat_signa', signa],
                ['aturan_pakai', field('aturan_pakai').value],
                ['obat_keterangan', field('obat_keterangan').value],
              ].forEach(function (pair) {
                var hidden = document.createElement('input');
                hidden.type = 'text';
                hidden.style.display = 'none';
                hidden.name = 'ResepDetail[' + x + '][' + pair[0] + ']';
                hidden.value = pair[1];
                row.appendChild(hidden);
              });
              detail.appendChild(row);
              ['obat_id', 'stok_obat', 'obat_nama', 'obat_jumlah', 'obat_jumlah_permintaan', 'obat_signa', 'signa_nama', 'obat_keterangan'].forEach(function (name) {
                field(name).value = '';
              });
              return true;
            });
          })();
        </script>
      </body>
    </html>
  `;
}
