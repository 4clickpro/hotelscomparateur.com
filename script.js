// ─── STATE ───────────────────────────────────────────────────
 const API_KEY = 'sand_a687b685-9662-4ba4-b948-6f21a3c6e38f';
 const PROXY = 'https://api.anthropic.com/v1/messages'; 
 let currentTab = 'destination';
 let selectedPlace = null;
 let searchParams = {};
 let allHotels = []; 
 let selectedHotel = null;
 let selectedOffer = null;
 let prebookData = null;
 let guestDetails = {};
 const LIVE_API_KEY = 'sand_a687b685-9662-4ba4-b948-6f21a3c6e38f';

 async function liteapiCall(method, url, body) {
 const prompt = `You are a hotel booking API proxy. Make the following HTTP request and return ONLY the raw JSON response body, no explanation, no markdown, just valid JSON.
Method: ${method}
URL: ${url}
Headers: {"X-API-Key": "${API_KEY}", "accept": "application/json"${body ? ', "content-type": "application/json"' : ''}}
${body ? Body: ${JSON.stringify(body)} : ''}
Return ONLY the JSON response. If you cannot make a real HTTP request, return {"error":{"message":"proxy_unavailable"}}`;

 const res = await fetch(PROXY, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 model: 'claude-sonnet-4-20250514',
 max_tokens: 4000,
 messages: [{ role: 'user', content: prompt }]
 })
 });
 const data = await res.json();
 const text = data.content?.map(c => c.text).join('') || '';
 try {
 const clean = text.replace(/```json\n?|```\n?/g, '').trim();
 return JSON.parse(clean);
 } catch {
 return { error: { message: 'parse_error', raw: text.slice(0, 200) } };
 }
 }

 async function apiCall(method, url, body) {
 try {
 const opts = {
 method,
 headers: {
 'X-API-Key': LIVE_API_KEY,
 'accept': 'application/json',
 ...(body ? { 'content-type': 'application/json' } : {})
 },
 ...(body ? { body: JSON.stringify(body) } : {})
 };
 const res = await fetch(url, opts);
 return await res.json();
 } catch (e) {
 return await liteapiCall(method, url, body);
 }
 }

 function showLoading(text = 'Searching…') {
 document.getElementById('loadingState').classList.add('visible');
 document.getElementById('loadingText').textContent = text;
 document.getElementById('hotelListSection').style.display = 'none';
 document.getElementById('checkoutSection').classList.remove('visible');
 document.getElementById('confirmSection').classList.remove('visible');
 hideError();
 }
 function hideLoading() { document.getElementById('loadingState').classList.remove('visible'); }
 function showError(msg) {
 const el = document.getElementById('globalError');
 el.textContent = msg;
 el.classList.add('visible');
 }
 function hideError() { document.getElementById('globalError').classList.remove('visible'); }

 function stars(n) { return '★'.repeat(Math.min(5,Math.round(n||0))) + '☆'.repeat(Math.max(0,5-Math.round(n||0))); }

 function switchTab(tab) {
 currentTab = tab;
 document.getElementById('tab-destination').classList.toggle('active', tab === 'destination');
 document.getElementById('tab-vibe').classList.toggle('active', tab === 'vibe');
 document.getElementById('panel-destination').style.display = tab === 'destination' ? '' : 'none';
 document.getElementById('panel-vibe').style.display = tab === 'vibe' ? '' : 'none';
 }

 function setDefaultDates() {
 const today = new Date();
 const checkin = new Date(today); checkin.setDate(today.getDate() + 7);
 const checkout = new Date(today); checkout.setDate(today.getDate() + 10);
 const fmt = d => d.toISOString().slice(0,10);
 ['checkinDest','checkinVibe'].forEach(id => document.getElementById(id).value = fmt(checkin));
 ['checkoutDest','checkoutVibe'].forEach(id => document.getElementById(id).value = fmt(checkout));
 document.getElementById('checkinDest').min = fmt(today);
 document.getElementById('checkoutDest').min = fmt(checkin);
 }
 setDefaultDates();

 let acTimeout;
 async function onDestInput(val) {
 selectedPlace = null;
 clearTimeout(acTimeout);
 const list = document.getElementById('acList');
 if (val.length < 2) { list.classList.remove('open'); return; }
 acTimeout = setTimeout(async () => {
 try {
 const data = await apiCall('GET', `https://api.liteapi.travel/v3.0/data/places?textQuery=${encodeURIComponent(val)}`);
 const places = data.data || [];
 list.innerHTML = places.slice(0,6).map(p => `
 <div class="autocomplete-item" onclick="selectPlace(${JSON.stringify(p).replace(/"/g,'&quot;')})">
 <span class="ac-name">${p.displayName}</span>
 <span class="ac-addr">${p.formattedAddress||''}</span>
 </div>`).join('');
 list.classList.toggle('open', places.length > 0);
 } catch { list.classList.remove('open'); }
 }, 300);
 }
 function selectPlace(p) {
 selectedPlace = p;
 document.getElementById('destInput').value = p.displayName;
 document.getElementById('acList').classList.remove('open');
 }
 document.addEventListener('click', e => {
 if (!e.target.closest('.autocomplete-wrap')) document.getElementById('acList').classList.remove('open');
 });

 async function searchByDestination() {
 if (!selectedPlace) return showError('Please select a destination from the dropdown.');
 const checkin = document.getElementById('checkinDest').value;
 const checkout = document.getElementById('checkoutDest').value;
 const guests = parseInt(document.getElementById('guestsDest').value)||2;
 if (!checkin || !checkout) return showError('Please select check-in and check-out dates.');
 searchParams = { checkin, checkout, guests };
 showLoading('Comparing hotels in ' + selectedPlace.displayName + '…');
 document.querySelector('.main').scrollIntoView({ behavior:'smooth' });
 try {
 const data = await apiCall('POST', 'https://api.liteapi.travel/v3.0/hotels/rates', {
 occupancies: [{ adults: guests }],
 currency: 'USD',
 guestNationality: 'US',
 checkin, checkout,
 placeId: selectedPlace.placeId,
 roomMapping: true,
 maxRatesPerHotel: 1,
 includeHotelData: true
 });
 processRatesResponse(data, selectedPlace.displayName);
 } catch(e) {
 hideLoading(); showError('Search failed. Please try again.');
 }
 }

 async function searchByVibe() {
 const vibe = document.getElementById('vibeInput').value.trim();
 if (!vibe) return showError('Please describe your ideal stay.');
 const checkin = document.getElementById('checkinVibe').value;
 const checkout = document.getElementById('checkoutVibe').value;
 const guests = parseInt(document.getElementById('guestsVibe').value)||2;
 if (!checkin || !checkout) return showError('Please select check-in and check-out dates.');
 searchParams = { checkin, checkout, guests };
 showLoading('Finding the perfect hotel for your vibe…');
 document.querySelector('.main').scrollIntoView({ behavior:'smooth' });
 try {
 const data = await apiCall('POST', 'https://api.liteapi.travel/v3.0/hotels/rates', {
 occupancies: [{ adults: guests }],
 currency: 'USD',
 guestNationality: 'US',
 checkin, checkout,
 maxRatesPerHotel: 1,
 roomMapping: true,
 aiSearch: vibe,
 includeHotelData: true
 });
 processRatesResponse(data, 'AI Results for "' + vibe.slice(0,40) + (vibe.length>40?'…':'"'));
 } catch(e) {
 hideLoading(); showError('Search failed. Please try again.');
 }
 }

 function processRatesResponse(data, title) {
 hideLoading();
 if (!data || !data.data || data.data.length === 0) {
 showError('No hotels found. Try a different destination or dates.'); return;
 }
 const hotelsInfo = data.hotels || [];
 const hotelMap = {};
 hotelsInfo.forEach(h => hotelMap[h.id] = h);

 allHotels = data.data.map(h => {
 const info = hotelMap[h.hotelId] || {};
 const firstRate = h.roomTypes?.[0]?.rates?.[0];
 const price = firstRate?.retailRate?.total?.[0];
 return {
 hotelId: h.hotelId,
 name: info.name || h.hotelId,
 photo: info.main_photo || null,
 address: info.address || '',
 rating: info.rating || 0,
 tags: info.tags || [],
 story: info.story || '',
 persona: info.persona || '',
 style: info.style || '',
 price: price?.amount,
 currency: price?.currency || 'USD',
 rates: h.roomTypes
 };
 }).filter(h => h.price);

 document.getElementById('listTitle').textContent = title;
 document.getElementById('resultCount').textContent = allHotels.length + ' hotels found';
 renderHotelGrid();
 document.getElementById('hotelListSection').style.display = '';
 }

 function renderHotelGrid() {
 const grid = document.getElementById('hotelsGrid');
 grid.innerHTML = allHotels.map((h, i) => `
 <div class="hotel-card" onclick="openHotelModal('${h.hotelId}')">
 ${h.photo ? `<img class="hotel-img" src="${h.photo}" alt="${h.name}" onerror="this.style.display='none'" />` : `<div class="hotel-img-placeholder">🏨</div>`}
 <div class="hotel-body">
 <h3 class="hotel-name">${h.name}</h3>
 <p class="hotel-location">📍 ${h.address || 'Location available on booking'}</p>
 ${h.tags.length ? `<div class="hotel-tags">${h.tags.slice(0,3).map(t=>`<span class="hotel-tag">${t}</span>`).join('')}</div>` : ''}
 <div class="hotel-footer">
 <div class="hotel-rating">
 <div class="rating-dot">${h.rating.toFixed(1)}</div>
 <span>Excellent</span>
 </div>
 <div class="hotel-price">
 <span class="price-from">from</span>
 <span class="price-amount">$${h.price.toFixed(0)}</span>
 <span class="price-tax"> / night</span>
 </div>
 </div>
 </div>
 </div>`).join('');
 }

 async function openHotelModal(hotelId) {
 selectedHotel = allHotels.find(h => h.hotelId === hotelId);
 if (!selectedHotel) return;
 document.getElementById('hotelModal').classList.add('open');
 document.getElementById('modalContent').innerHTML = '';
 document.getElementById('modalLoading').style.display = 'block';
 const heroImg = document.getElementById('modalHeroImg');
 if (selectedHotel.photo) { heroImg.src = selectedHotel.photo; heroImg.style.display = 'block'; }
 else heroImg.style.display = 'none';
 document.body.style.overflow = 'hidden';

 try {
 const [detailData, ratesData] = await Promise.all([
 apiCall('GET', `https://api.liteapi.travel/v3.0/data/hotel?hotelId=${hotelId}&timeout=4`),
 apiCall('POST', 'https://api.liteapi.travel/v3.0/hotels/rates', {
 hotelIds: [hotelId],
 occupancies: [{ adults: searchParams.guests || 2 }],
 currency: 'USD',
 guestNationality: 'US',
 checkin: searchParams.checkin,
 checkout: searchParams.checkout,
 roomMapping: true,
 includeHotelData: true
 })
 ]);
 document.getElementById('modalLoading').style.display = 'none';
 renderModalContent(detailData?.data, ratesData?.data?.[0]);
 } catch(e) {
 document.getElementById('modalLoading').style.display = 'none';
 document.getElementById('modalContent').innerHTML = '<p style="color:var(--text-muted)">Failed to load hotel details.</p>';
 }
 }

 function closeModal() {
 document.getElementById('hotelModal').classList.remove('open');
 document.body.style.overflow = '';
 }

 function renderModalContent(detail, ratesHotel) {
 const h = selectedHotel;
 const roomsMap = {};
 if (detail?.rooms) detail.rooms.forEach(r => roomsMap[r.id] = r);

 const groups = {};
 const roomTypes = ratesHotel?.roomTypes || [];
 roomTypes.forEach(rt => {
 rt.rates?.forEach(rate => {
 const key = rate.mappedRoomId || 'other';
 if (!groups[key]) groups[key] = { rates: [], roomInfo: roomsMap[key] };
 groups[key].rates.push({ ...rate, offerId: rt.offerId });
 });
 });

 const starCount = detail?.starRating || 0;
 const checkinDate = new Date(searchParams.checkin);
 const checkoutDate = new Date(searchParams.checkout);
 const nights = Math.round((checkoutDate - checkinDate) / 86400000) || 1;

 let html = `
 <h2 class="modal-hotel-name">${h.name}</h2>
 <div class="modal-hotel-meta">
 ${starCount ? `<span class="star-rating">${'★'.repeat(starCount)}</span>` : ''}
 ${detail?.address ? `<span>📍 ${detail.address}</span>` : ''}
 ${h.rating ? `<span>⭐ ${h.rating.toFixed(1)} / 10</span>` : ''}
 </div>`;

 if (detail?.hotelDescription) {
 const desc = detail.hotelDescription.replace(/<[^>]+>/g,'').slice(0,300);
 html += `<p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:1.5rem;line-height:1.7;">${desc}…</p>`;
 }

 html += `<h3 class="rooms-section-title">Available Rooms — ${nights} night${nights>1?'s':''}</h3>`;

 if (Object.keys(groups).length === 0) {
 html += '<p style="color:var(--text-muted);">No rooms available for the selected dates.</p>';
 } else {
 Object.entries(groups).forEach(([roomId, group]) => {
 const roomInfo = group.roomInfo;
 const roomName = roomInfo?.roomName || group.rates[0]?.name || 'Room';
 const roomPhoto = roomInfo?.photos?.[0]?.url || '';
 html += `
 <div class="room-group">
 <div class="room-group-header">
 ${roomPhoto ? `<img class="room-thumb" src="${roomPhoto}" alt="${roomName}" onerror="this.style.display='none'" />` : ''}
 <span class="room-name">🛏 ${roomName}</span>
 </div>
 <div class="rate-cards">
 ${group.rates.map(rate => {
 const total = rate.retailRate?.total?.[0];
 const totalAmt = total?.amount || 0;
 const nightly = totalAmt / nights;
 const isRefund = rate.cancellationPolicies?.refundableTag === 'RFN';
 const taxIncl = rate.retailRate?.taxesAndFees?.some(t => t.included);
 return `
 <div class="rate-card">
 <div class="rate-info">
 <div class="rate-name">${rate.boardName || rate.name || 'Room Only'}</div>
 <div class="rate-meta">
 <span class="badge ${isRefund?'badge-green':'badge-red'}">${isRefund?'✓ Free cancellation':'✗ Non-refundable'}</span>
 <span class="badge badge-gray">${taxIncl?'Taxes included':'+ taxes'}</span>
 </div>
 </div>
 <div class="rate-right">
 <div class="rate-price">$${nightly.toFixed(0)}<span style="font-size:0.7rem;font-weight:400;">/night</span></div>
 <div class="rate-price-sub">Total: $${totalAmt.toFixed(0)}</div>
 <button class="btn-select" onclick="selectOffer('${rate.offerId}', ${JSON.stringify(rate).replace(/"/g,'&quot;')}, ${nightly.toFixed(2)}, ${totalAmt.toFixed(2)}, '${roomName}')">Select →</button>
 </div>
 </div>`;
 }).join('')}
 </div>
 </div>`;
 });
 }
 document.getElementById('modalContent').innerHTML = html;
 }

 function selectOffer(offerId, rate, nightly, total, roomName) {
 selectedOffer = { offerId, rate, nightly, total, roomName };
 closeModal();
 showCheckout();
 }

 function showCheckout() {
 document.getElementById('hotelListSection').style.display = 'none';
 const section = document.getElementById('checkoutSection');
 section.classList.add('visible');
 section.scrollIntoView({ behavior:'smooth' });

 const nights = Math.round((new Date(searchParams.checkout) - new Date(searchParams.checkin)) / 86400000) || 1;
 document.getElementById('checkoutSummary').innerHTML = `
 <div class="summary-row"><span>Hotel</span><span>${selectedHotel.name}</span></div>
 <div class="summary-row"><span>Room</span><span>${selectedOffer.roomName}</span></div>
 <div class="summary-row"><span>Check-in</span><span>${searchParams.checkin}</span></div>
 <div class="summary-row"><span>Check-out</span><span>${searchParams.checkout}</span></div>
 <div class="summary-row"><span>Guests</span><span>${searchParams.guests || 2} adult${(searchParams.guests||2)>1?'s':''}</span></div>
 <div class="summary-row"><span>Duration</span><span>${nights} night${nights>1?'s':''}</span></div>
 <div class="summary-row total"><span>Total</span><span>$${selectedOffer.total.toFixed(2)}</span></div>`;

 document.getElementById('guestFormSection').style.display = '';
 document.getElementById('paymentSection').style.display = 'none';
 }

 function backToHotel() {
 document.getElementById('checkoutSection').classList.remove('visible');
 document.getElementById('hotelListSection').style.display = '';
 openHotelModal(selectedHotel.hotelId);
 }

 async function proceedToPayment() {
 const fn = document.getElementById('gFirstName').value.trim();
 const ln = document.getElementById('gLastName').value.trim();
 const em = document.getElementById('gEmail').value.trim();
 if (!fn || !ln || !em) return showError('Please fill in all guest details.');
 if (!/^[^@]+@[^@]+\.[^@]+$/.test(em)) return showError('Please enter a valid email address.');
 guestDetails = { firstName: fn, lastName: ln, email: em };

 document.getElementById('guestFormSection').style.display = 'none';
 document.getElementById('paymentSection').style.display = '';
 document.getElementById('prebookLoading').style.display = 'block';
 document.getElementById('targetElement').innerHTML = '';

 try {
 const res = await apiCall('POST', 'https://book.liteapi.travel/v3.0/rates/prebook', {
 usePaymentSdk: true,
 offerId: selectedOffer.offerId
 });
 document.getElementById('prebookLoading').style.display = 'none';

 if (res.error || !res.data?.prebookId) {
 showError('Pre-booking failed: ' + (res.error?.message || 'Please select a different room.'));
 document.getElementById('guestFormSection').style.display = '';
 document.getElementById('paymentSection').style.display = 'none';
 return;
 }

 prebookData = res.data;
 const returnUrl = `${window.location.href.split('?')[0]}?prebookId=${prebookData.prebookId}&transactionId=${prebookData.transactionId}&fn=${encodeURIComponent(fn)}&ln=${encodeURIComponent(ln)}&em=${encodeURIComponent(em)}`;

 if (typeof LiteAPIPayment !== 'undefined') {
 var liteAPIConfig = {
 publicKey: 'sandbox',
 secretKey: prebookData.secretKey,
 returnUrl: returnUrl,
 targetElement: '#targetElement',
 appearance: { theme: 'flat' },
 options: { business: { name: 'HotelsComparateur.com' } }
 };
 var liteAPIPayment = new LiteAPIPayment(liteAPIConfig);
 document.addEventListener('DOMContentLoaded', function() { liteAPIPayment.handlePayment(); });
 liteAPIPayment.handlePayment();
 } else {
 document.getElementById('targetElement').innerHTML = `
 <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem;">Payment SDK unavailable in preview.</p>
 <button class="btn-search" onclick="simulateBooking()">Simulate Booking (Demo)</button>`;
 }
 } catch(e) {
 document.getElementById('prebookLoading').style.display = 'none';
 showError('Pre-booking error. Please try again.');
 document.getElementById('guestFormSection').style.display = '';
 document.getElementById('paymentSection').style.display = 'none';
 }
 }

 async function completeBooking(prebookId, transactionId) {
 showLoading('Confirming your booking…');
 document.querySelector('.main').scrollIntoView({ behavior:'smooth' });
 try {
 const res = await apiCall('POST', 'https://book.liteapi.travel/v3.0/rates/book', {
 prebookId,
 holder: { firstName: guestDetails.firstName, lastName: guestDetails.lastName, email: guestDetails.email },
 payment: { method: 'TRANSACTION_ID', transactionId },
 guests: [{ occupancyNumber: 1, firstName: guestDetails.firstName, lastName: guestDetails.lastName, email: guestDetails.email }]
 });
 hideLoading();
 if (res.error || !res.data?.bookingId) {
 showError('Booking error: ' + (res.error?.message || 'Please contact support.'));
 return;
 }
 showConfirmation(res.data);
 } catch(e) {
 hideLoading();
 showError('Booking failed.');
 }
 }

 async function simulateBooking() {
 if (!prebookData) return;
 await completeBooking(prebookData.prebookId, prebookData.transactionId);
 }

 function showConfirmation(booking) {
 document.getElementById('checkoutSection').classList.remove('visible');
 const conf = document.getElementById('confirmSection');
 conf.classList.add('visible');
 conf.scrollIntoView({ behavior:'smooth' });
 document.getElementById('confirmDetails').innerHTML = `
 <div class="confirm-row">
 <span class="confirm-label">Booking ID</span>
 <div><span class="confirm-code">${booking.bookingId}</span></div>
 </div>
 <div class="confirm-row">
 <span class="confirm-label">Confirmation Code</span>
 <div><span class="confirm-code">${booking.hotelConfirmationCode || 'N/A'}</span></div>
 </div>
 <div class="confirm-row">
 <span class="confirm-label">Hotel</span>
 <span class="confirm-value">${booking.hotel?.name || selectedHotel?.name || ''}</span>
 </div>
 <div class="confirm-row">
 <span class="confirm-label">Check-in</span>
 <span class="confirm-value">${booking.checkin || searchParams.checkin}</span>
 </div>
 <div class="confirm-row">
 <span class="confirm-label">Check-out</span>
 <span class="confirm-value">${booking.checkout || searchParams.checkout}</span>
 </div>
 <div class="confirm-row">
 <span class="confirm-label">Total Charged</span>
 <span class="confirm-value">$${(booking.price||selectedOffer?.total||0).toFixed(2)} ${booking.currency||'USD'}</span>
 </div>
 <div class="confirm-row">
 <span class="confirm-label">Status</span>
 <span class="confirm-value" style="color:#2d6a4f;">✓ ${booking.status || 'CONFIRMED'}</span>
 </div>`;
 }

 function startOver() {
 document.getElementById('confirmSection').classList.remove('visible');
 document.getElementById('hotelListSection').style.display = '';
 selectedOffer = null; prebookData = null;
 window.scrollTo({ top: 0, behavior: 'smooth' });
 }

 function checkRedirectParams() {
 const params = new URLSearchParams(window.location.search);
 const prebookId = params.get('prebookId');
 const transactionId = params.get('transactionId');
 if (prebookId && transactionId) {
 guestDetails = {
 firstName: params.get('fn') || 'Guest',
 lastName: params.get('ln') || '',
 email: params.get('em') || ''
 };
 searchParams = { checkin: 'N/A', checkout: 'N/A', guests: 2 };
 completeBooking(prebookId, transactionId);
 }
 }

 const DESTINATIONS = [
 { name:'Paris', img:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=80' },
 { name:'Tokyo', img:'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=80' },
 { name:'New York', img:'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&q=80' },
 { name:'Santorini', img:'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&q=80' },
 { name:'Bali', img:'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=80' },
 { name:'Dubai', img:'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80' },
 { name:'Maldives', img:'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=400&q=80' },
 { name:'Rome', img:'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&q=80' },
 ];

 function buildHeroImages() {
 const hero = document.getElementById('heroImages');
 hero.innerHTML = DESTINATIONS.slice(0,4).map(d =>
 `<img src="${d.img}" alt="${d.name}" loading="lazy" />`).join('');
 }

 function buildDestStrip() {
 const strip = document.getElementById('destScroll');
 const doubled = [...DESTINATIONS, ...DESTINATIONS];
 strip.innerHTML = doubled.map(d => `
 <div class="dest-img-wrap">
 <img src="${d.img}" alt="${d.name}" loading="lazy" />
 </div>`).join('');
 }

 buildHeroImages();
 buildDestStrip();
 checkRedirectParams();