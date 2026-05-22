const USERS_SHEET = 'Users';
const FLAGSHIP_RECORDS_SHEET = 'Records';
const PLACEMENT_RECORDS_SHEET = 'PlacementRecords';

function doPost(e) {
  const payload = parsePayload_(e);
  const action = payload.action || '';

  if (action === 'auth') {
    return json_(authenticate_(payload));
  }

  if (action === 'register') {
    return text_(register_(payload));
  }

  if (action === 'updateProfile') {
    return json_(updateProfile_(payload));
  }

  if (action === 'savePlacementRecord') {
    saveRecord_(payload, 'placement');
    return text_('success');
  }

  if (action === 'saveRecord') {
    saveRecord_(payload, payload.game || 'flagship');
    return text_('success');
  }

  return text_('unknown_action');
}

function doGet(e) {
  const params = e.parameter || {};
  const action = params.action || '';

  if (action === 'getLeaderboard') {
    return json_(getLeaderboard_(params.game || 'flagship', Number(params.level || 1)));
  }

  return json_({ status: 'unknown_action' });
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    return {};
  }
}

function spreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name, headers) {
  const ss = spreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  const width = Math.max(headers.length, sheet.getLastColumn() || 1);
  const firstRow = sheet.getRange(1, 1, 1, width).getValues()[0];
  const hasHeaders = firstRow.some(value => String(value || '').trim());

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    headers.forEach(header => ensureColumn_(sheet, header));
  }

  return sheet;
}

function usersSheet_() {
  return sheet_(USERS_SHEET, ['username', 'password', 'photo', 'photoX', 'photoY', 'photoScale', 'meowtopiaLevel', 'placementLevel']);
}

function recordsSheet_(game) {
  if (game === 'placement') {
    return sheet_(PLACEMENT_RECORDS_SHEET, ['timestamp', 'username', 'level', 'steps', 'time', 'placement']);
  }

  return sheet_(FLAGSHIP_RECORDS_SHEET, ['timestamp', 'username', 'level', 'steps', 'time', 'circuit']);
}

function getHeaders_(sheet) {
  if (sheet.getLastColumn() < 1) {
    return [];
  }

  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(value => String(value || '').trim());
}

function normalizedHeader_(header) {
  return String(header || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function headerAliases_(canonical) {
  const aliases = {
    username: ['username', 'user', 'name', 'player', 'account'],
    password: ['password', 'pass', 'pwd'],
    photo: ['photo', 'avatar', 'image', 'picture', 'profilephoto'],
    photoX: ['photox', 'avatarx', 'imagex', 'picturex'],
    photoY: ['photoy', 'avatary', 'imagey', 'picturey'],
    photoScale: ['photoscale', 'avatarzoom', 'photozoom', 'imagezoom', 'scale', 'zoom'],
    meowtopiaLevel: ['meowtopialevel', 'flagshiplevel', 'currentlevel', 'level'],
    placementLevel: ['placementlevel', 'sensorlevel', 'placementprogress'],
    timestamp: ['timestamp', 'timecreated', 'createdat', 'date'],
    level: ['level', 'stage'],
    steps: ['steps', 'step', 'cats', 'catcount'],
    time: ['time', 'seconds', 'sec'],
    circuit: ['circuit'],
    placement: ['placement', 'circuit']
  };

  return aliases[canonical] || [canonical];
}

function columnIndex_(headers, canonical) {
  const wanted = headerAliases_(canonical).map(normalizedHeader_);
  for (let index = 0; index < headers.length; index++) {
    if (wanted.indexOf(normalizedHeader_(headers[index])) !== -1) {
      return index;
    }
  }

  return -1;
}

function normalizedUsername_(username) {
  return String(username || '').trim().toLowerCase();
}

function ensureColumn_(sheet, canonical) {
  const headers = getHeaders_(sheet);
  const existingIndex = columnIndex_(headers, canonical);

  if (existingIndex !== -1) {
    if (headers[existingIndex] !== canonical) {
      sheet.getRange(1, existingIndex + 1).setValue(canonical);
    }
    return existingIndex + 1;
  }

  const nextColumn = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextColumn).setValue(canonical);
  return nextColumn;
}

function getCell_(sheet, rowNumber, canonical) {
  const column = ensureColumn_(sheet, canonical);
  return sheet.getRange(rowNumber, column).getValue();
}

function setCell_(sheet, rowNumber, canonical, value) {
  const column = ensureColumn_(sheet, canonical);
  sheet.getRange(rowNumber, column).setValue(value);
}

function findUserRow_(username) {
  const sheet = usersSheet_();
  const data = sheet.getDataRange().getValues();
  const headers = getHeaders_(sheet);
  const usernameIndex = columnIndex_(headers, 'username');

  if (usernameIndex === -1) {
    return { sheet, rowNumber: -1, rowValues: null, headers };
  }

  for (let row = 1; row < data.length; row++) {
    if (normalizedUsername_(data[row][usernameIndex]) === normalizedUsername_(username)) {
      return { sheet, rowNumber: row + 1, rowValues: data[row], headers };
    }
  }

  return { sheet, rowNumber: -1, rowValues: null, headers };
}

function authenticate_(payload) {
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '').trim();
  const found = findUserRow_(username);

  if (found.rowNumber === -1) {
    return { status: 'not_found' };
  }

  const storedPassword = String(getCell_(found.sheet, found.rowNumber, 'password') || '').trim();
  if (storedPassword !== password) {
    return { status: 'wrong_password' };
  }

  let meowtopiaLevel = Number(getCell_(found.sheet, found.rowNumber, 'meowtopiaLevel') || 0);
  let placementLevel = Number(getCell_(found.sheet, found.rowNumber, 'placementLevel') || 0);

  if (!meowtopiaLevel) {
    meowtopiaLevel = 1;
    setCell_(found.sheet, found.rowNumber, 'meowtopiaLevel', meowtopiaLevel);
  }

  if (!placementLevel) {
    placementLevel = 1;
    setCell_(found.sheet, found.rowNumber, 'placementLevel', placementLevel);
  }

  return {
    status: 'success',
    level: meowtopiaLevel,
    meowtopiaLevel: meowtopiaLevel,
    placementLevel: placementLevel,
    photo: String(getCell_(found.sheet, found.rowNumber, 'photo') || ''),
    photoX: Number(getCell_(found.sheet, found.rowNumber, 'photoX') || 50),
    photoY: Number(getCell_(found.sheet, found.rowNumber, 'photoY') || 50),
    photoScale: Number(getCell_(found.sheet, found.rowNumber, 'photoScale') || 1)
  };
}

function register_(payload) {
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '').trim();

  if (!username || !password) {
    return 'failed';
  }

  const found = findUserRow_(username);
  if (found.rowNumber !== -1) {
    return 'exists';
  }

  const sheet = usersSheet_();
  const nextRow = sheet.getLastRow() + 1;
  setCell_(sheet, nextRow, 'username', username);
  setCell_(sheet, nextRow, 'password', password);
  setCell_(sheet, nextRow, 'photo', String(payload.photo || ''));
  setCell_(sheet, nextRow, 'photoX', Number(payload.photoX || 50));
  setCell_(sheet, nextRow, 'photoY', Number(payload.photoY || 50));
  setCell_(sheet, nextRow, 'photoScale', Number(payload.photoScale || 1));
  setCell_(sheet, nextRow, 'meowtopiaLevel', 1);
  setCell_(sheet, nextRow, 'placementLevel', 1);
  return 'success';
}

function updateProfile_(payload) {
  const currentUsername = String(payload.currentUsername || '').trim();
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '').trim();
  const photo = String(payload.photo || '');
  const photoX = Number(payload.photoX || 50);
  const photoY = Number(payload.photoY || 50);
  const photoScale = Number(payload.photoScale || 1);

  if (!currentUsername || !username) {
    return { status: 'failed' };
  }

  const found = findUserRow_(currentUsername);
  if (found.rowNumber === -1) {
    return { status: 'not_found' };
  }

  if (normalizedUsername_(username) !== normalizedUsername_(currentUsername)) {
    const duplicate = findUserRow_(username);
    if (duplicate.rowNumber !== -1 && duplicate.rowNumber !== found.rowNumber) {
      return { status: 'exists' };
    }
  }

  if (normalizedUsername_(username) !== normalizedUsername_(currentUsername)) {
    renameRecordUsernames_(currentUsername, username);
  }

  setCell_(found.sheet, found.rowNumber, 'username', username);
  if (password) {
    setCell_(found.sheet, found.rowNumber, 'password', password);
  }
  setCell_(found.sheet, found.rowNumber, 'photo', photo);
  setCell_(found.sheet, found.rowNumber, 'photoX', photoX);
  setCell_(found.sheet, found.rowNumber, 'photoY', photoY);
  setCell_(found.sheet, found.rowNumber, 'photoScale', photoScale);

  return {
    status: 'success',
    username: username,
    photo: photo,
    photoX: photoX,
    photoY: photoY,
    photoScale: photoScale
  };
}

function renameRecordUsernames_(oldUsername, newUsername) {
  [FLAGSHIP_RECORDS_SHEET, PLACEMENT_RECORDS_SHEET].forEach(sheetName => {
    const sheet = spreadsheet_().getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) {
      return;
    }

    const headers = getHeaders_(sheet);
    const usernameIndex = columnIndex_(headers, 'username');
    if (usernameIndex === -1) {
      return;
    }

    const rowCount = sheet.getLastRow() - 1;
    const range = sheet.getRange(2, usernameIndex + 1, rowCount, 1);
    const values = range.getValues();
    let changed = false;

    for (let row = 0; row < values.length; row++) {
      if (normalizedUsername_(values[row][0]) === normalizedUsername_(oldUsername)) {
        values[row][0] = newUsername;
        changed = true;
      }
    }

    if (changed) {
      range.setValues(values);
    }
  });
}

function saveRecord_(payload, game) {
  const username = String(payload.username || '').trim();
  const level = Number(payload.level || 1);
  const steps = Number(payload.steps || 0);
  const time = Number(payload.time || 0);
  const placement = String(payload.placement || payload.circuit || '');

  if (!username || !level) {
    return;
  }

  const records = recordsSheet_(game);
  const nextRow = records.getLastRow() + 1;
  setCell_(records, nextRow, 'timestamp', new Date());
  setCell_(records, nextRow, 'username', username);
  setCell_(records, nextRow, 'level', level);
  setCell_(records, nextRow, 'steps', steps);
  setCell_(records, nextRow, 'time', time);

  if (game === 'placement') {
    setCell_(records, nextRow, 'placement', placement);
    updateUserProgress_(username, 'placementLevel', Number(payload.unlockedLevel || level + 1));
  } else {
    setCell_(records, nextRow, 'circuit', placement);
    updateUserProgress_(username, 'meowtopiaLevel', level + 1);
  }
}

function updateUserProgress_(username, columnName, nextLevel) {
  const found = findUserRow_(username);
  if (found.rowNumber === -1) {
    return;
  }

  const current = Number(getCell_(found.sheet, found.rowNumber, columnName) || 1);
  if (nextLevel > current) {
    setCell_(found.sheet, found.rowNumber, columnName, nextLevel);
  }
}

function rankNumber_(value) {
  const number = Number(value);
  return isFinite(number) ? number : Infinity;
}

function getLeaderboard_(game, level) {
  const sheet = recordsSheet_(game);
  const data = sheet.getDataRange().getValues();
  const headers = getHeaders_(sheet);
  const usernameIndex = columnIndex_(headers, 'username');
  const levelIndex = columnIndex_(headers, 'level');
  const stepsIndex = columnIndex_(headers, 'steps');
  const timeIndex = columnIndex_(headers, 'time');
  const profiles = getUserProfiles_();

  if ([usernameIndex, levelIndex, stepsIndex, timeIndex].some(index => index === -1)) {
    return [];
  }

  // Collect one best record per player (lowest steps; tiebreak by lowest time).
  const bestByUser = {};

  for (let row = 1; row < data.length; row++) {
    if (Number(data[row][levelIndex]) !== level) {
      continue;
    }

    const username = String(data[row][usernameIndex] || '').trim();
    const userKey = normalizedUsername_(username);
    if (!username) {
      continue;
    }

    const steps = Number(data[row][stepsIndex]);
    const time  = Number(data[row][timeIndex]);

    if (!isFinite(steps) || !isFinite(time)) {
      continue;
    }

    const existing = bestByUser[userKey];
    if (!existing ||
        steps < existing.steps ||
        (steps === existing.steps && time < existing.time)) {
      const profile = profiles[userKey] || {};
      bestByUser[userKey] = {
        username: profile.username || username,
        level:    level,
        steps:    steps,
        time:     time,
        photo:    profile.photo  || '',
        photoX:   profile.photoX || 50,
        photoY:   profile.photoY || 50,
        photoScale: profile.photoScale || 1
      };
    }
  }

  // Sort by steps asc, then time asc
  return Object.values(bestByUser).sort((a, b) => {
    if (rankNumber_(a.steps) !== rankNumber_(b.steps)) return rankNumber_(a.steps) - rankNumber_(b.steps);
    return rankNumber_(a.time) - rankNumber_(b.time);
  });
}

function getUserProfiles_() {
  const sheet = usersSheet_();
  const data = sheet.getDataRange().getValues();
  const headers = getHeaders_(sheet);
  const usernameIndex = columnIndex_(headers, 'username');
  const photoIndex = columnIndex_(headers, 'photo');
  const photoXIndex = columnIndex_(headers, 'photoX');
  const photoYIndex = columnIndex_(headers, 'photoY');
  const photoScaleIndex = columnIndex_(headers, 'photoScale');
  const profiles = {};

  if (usernameIndex === -1) {
    return profiles;
  }

  for (let row = 1; row < data.length; row++) {
    const username = String(data[row][usernameIndex] || '').trim();
    if (!username) {
      continue;
    }
    profiles[normalizedUsername_(username)] = {
      username: username,
      photo: photoIndex === -1 ? '' : String(data[row][photoIndex] || ''),
      photoX: photoXIndex === -1 ? 50 : Number(data[row][photoXIndex] || 50),
      photoY: photoYIndex === -1 ? 50 : Number(data[row][photoYIndex] || 50),
      photoScale: photoScaleIndex === -1 ? 1 : Number(data[row][photoScaleIndex] || 1)
    };
  }

  return profiles;
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function text_(value) {
  return ContentService
    .createTextOutput(String(value))
    .setMimeType(ContentService.MimeType.TEXT);
}
