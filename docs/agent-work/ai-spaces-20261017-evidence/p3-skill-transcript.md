# Phase 3: the Allworld skill, end to end against a local server

Followed skills/allworld-spaces/SKILL.md as an agent with a fresh key (create_agent_account) on the local dev server's game port. The key is redacted. Steps 4 and 6 are the skill's check-fix-import loop.

```

## 0. agent key made (create_agent_account)
{
 "ok": true,
 "key": "<key>"
}

## 1–3. learn the player: get_my_life
{
 "city": "lagos",
 "cash": 5000,
 "needs": {
  "hunger": 50,
  "energy": 50,
  "fun": 50,
  "social": 50,
  "hygiene": 50,
  "bladder": 50
 },
 "mood": "Okay",
 "job": null,
 "place": {
  "id": "park",
  "label": "Freedom Park",
  "spot": "amphitheatre",
  "open": true
 },
 "doing": null,
 "time": {
  "lagos": "01:11",
  "day": "Sun"
 },
 "cursor": "aowo6ic043"
}

## 4. draft and check_space (first draft)
{
 "ok": true,
 "code": "checked",
 "plan": {
  "schema": "allworld-space",
  "version": 1,
  "target": "home",
  "items": [
   {
    "itemId": "sleeping-mat",
    "x": 0,
    "y": 0,
    "rot": 0
   },
   {
    "itemId": "plastic-chair",
    "x": 1,
    "y": 1,
    "rot": 0
   },
   {
    "itemId": "lantern",
    "x": 4,
    "y": 0,
    "rot": 0
   },
   {
    "itemId": "wall-calendar",
    "x": 2,
    "y": 0,
    "rot": 0
   }
  ],
  "title": "Small reading corner"
 },
 "problems": [
  {
   "index": 1,
   "itemId": "plastic-chair",
   "code": "moved",
   "reason": "Plastic Chair moved to x 1, y 1: That spot overlaps your Raffia Sleeping Mat."
  }
 ],
 "cost": 3500,
 "cash": 5000,
 "space": {
  "grid": 8,
  "owned": false
 }
}

## 4. check_space again after moving the chair the check named
{
 "ok": true,
 "code": "checked",
 "plan": {
  "schema": "allworld-space",
  "version": 1,
  "target": "home",
  "items": [
   {
    "itemId": "sleeping-mat",
    "x": 0,
    "y": 0,
    "rot": 0
   },
   {
    "itemId": "plastic-chair",
    "x": 2,
    "y": 2,
    "rot": 0
   },
   {
    "itemId": "lantern",
    "x": 4,
    "y": 0,
    "rot": 0
   },
   {
    "itemId": "wall-calendar",
    "x": 2,
    "y": 0,
    "rot": 0
   }
  ],
  "title": "Small reading corner"
 },
 "problems": [],
 "cost": 3500,
 "cash": 5000,
 "space": {
  "grid": 8,
  "owned": false
 }
}

## 6. go_home, then import_space
{
 "ok": true,
 "code": "started",
 "result": "Travelling to Home.",
 "going": "home",
 "mode": "trek",
 "fare": 0,
 "endsInSeconds": 15,
 "ask": "Call wait_until_done, or do other quick things, then check get_my_life.",
 "life": {
  "city": "lagos",
  "cash": 5000,
  "needs": {
   "hunger": 50,
   "energy": 50,
   "fun": 50,
   "social": 50,
   "hygiene": 50,
   "bladder": 50
  },
  "mood": "Okay",
  "job": null,
  "place": {
   "id": "park",
   "label": "Freedom Park",
   "spot": "amphitheatre",
   "open": true
  },
  "doing": {
   "kind": "travel",
   "secondsLeft": 15
  },
  "time": {
   "lagos": "01:11",
   "day": "Sun"
  },
  "lastMessage": "Travelling to Home."
 }
}

## 6. import_space
{
 "ok": true,
 "code": "applied",
 "placed": 4,
 "spent": 3500,
 "problems": []
}

## 7. get_my_life after import
{
 "city": "lagos",
 "cash": 1500,
 "needs": {
  "hunger": 50,
  "energy": 40,
  "fun": 50,
  "social": 50,
  "hygiene": 43,
  "bladder": 50
 },
 "mood": "Okay",
 "job": null,
 "place": {
  "id": "home",
  "label": "Home",
  "spot": "kitchen",
  "open": true
 },
 "doing": null,
 "time": {
  "lagos": "01:13",
  "day": "Sun"
 },
 "lastMessage": "Wall Calendar placed from storage.",
 "cursor": "1v720w72k2l"
}
```
