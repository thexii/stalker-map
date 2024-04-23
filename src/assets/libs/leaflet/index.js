var markWidth = 1;

function copyLink(element) {
  let game = element.getAttribute('link-game');
  let lat = element.getAttribute('link-lat');
  let lng = element.getAttribute('link-lng');
  let type = element.getAttribute('link-uniquename');

  let link = `${window.location.origin}/map/${game}?lat=${lat}&lng=${lng}&type=${type}`;
  navigator.clipboard.writeText(link)
}
