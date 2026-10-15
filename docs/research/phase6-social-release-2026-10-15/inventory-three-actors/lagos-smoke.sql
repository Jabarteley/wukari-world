-- READ-ONLY; NOT EXECUTED. Exactly 3 approved actors total; NO FOURTH ACTOR.
-- BOUND ACTOR: Zz Test Phase6 Smoke (453a0f63-5b90-4e7b-b730-4ea9ff54b70d).
-- Copy of production-qa-inventory.sql.txt; only QA_UUID substitutions below.
-- READ-ONLY TEMPLATE. Not executed. Bind 453a0f63-5b90-4e7b-b730-4ea9ff54b70d to the one observed synthetic UUID.
-- Never return session.secret, backup.value, device/auth values or full session JSON.
SELECT epoch,writable,retired_from_epoch,wallet_effect_watermark
FROM main_store_authority WHERE singleton=1;
SELECT key,value FROM store_meta
WHERE key IN ('layout','synced:social','synced:civic','synced:growth','synced:street');
SELECT version FROM app_schema WHERE singleton=1;
SELECT public_id,json_extract(value,'$.publicId') AS embedded_id,
 json_extract(value,'$.name') AS name,json_type(value,'$.account') AS account_type
FROM sessions WHERE public_id='453a0f63-5b90-4e7b-b730-4ea9ff54b70d';
SELECT 'sessions' AS kind,count(*) AS n FROM sessions WHERE public_id='453a0f63-5b90-4e7b-b730-4ea9ff54b70d'
UNION ALL SELECT 'archives',count(*) FROM archived_lives WHERE public_id='453a0f63-5b90-4e7b-b730-4ea9ff54b70d'
UNION ALL SELECT 'accounts',count(*) FROM accounts WHERE public_id='453a0f63-5b90-4e7b-b730-4ea9ff54b70d'
UNION ALL SELECT 'linked_devices',count(*) FROM account_devices d JOIN sessions s ON d.secret=s.secret WHERE s.public_id='453a0f63-5b90-4e7b-b730-4ea9ff54b70d'
UNION ALL SELECT 'actions',count(*) FROM action_receipts WHERE sender='453a0f63-5b90-4e7b-b730-4ea9ff54b70d'
UNION ALL SELECT 'once',count(*) FROM once_receipts WHERE sender='453a0f63-5b90-4e7b-b730-4ea9ff54b70d'
UNION ALL SELECT 'wallet_audit',count(*) FROM wallet_effects WHERE public_id='453a0f63-5b90-4e7b-b730-4ea9ff54b70d';
-- Candidate references only. A hit is not a deletion authorization.
SELECT name,length(CAST(value AS BLOB)) AS bytes,json_valid(value) AS valid_json
FROM collections WHERE instr(value,'453a0f63-5b90-4e7b-b730-4ea9ff54b70d')>0 OR instr(name,'453a0f63-5b90-4e7b-b730-4ea9ff54b70d')>0;
SELECT coll,map,key,length(CAST(value AS BLOB)) AS bytes
FROM entries WHERE key='453a0f63-5b90-4e7b-b730-4ea9ff54b70d' OR instr(value,'453a0f63-5b90-4e7b-b730-4ea9ff54b70d')>0 OR instr(jx,'453a0f63-5b90-4e7b-b730-4ea9ff54b70d')>0;
SELECT name,count(*) AS parts FROM collection_parts
WHERE instr(name,'453a0f63-5b90-4e7b-b730-4ea9ff54b70d')>0 OR instr(value,'453a0f63-5b90-4e7b-b730-4ea9ff54b70d')>0 GROUP BY name;
SELECT count(*) AS linked_account_values FROM accounts
WHERE instr(value,'453a0f63-5b90-4e7b-b730-4ea9ff54b70d')>0;
-- Return field paths, not arbitrary scalar values. Review full reconstructed
-- collection only inside the operator surface if a fragmented candidate exists.
SELECT c.name,j.fullkey,j.type FROM collections c,
json_tree(CASE WHEN json_valid(c.value) THEN c.value ELSE '{}' END) j
WHERE j.key='453a0f63-5b90-4e7b-b730-4ea9ff54b70d' OR (j.type='text' AND j.value='453a0f63-5b90-4e7b-b730-4ea9ff54b70d');
-- Concatenate complete WORLD shards BEFORE matching or decoding: even the UUID
-- can cross a chunk boundary. Return only matching shard names, not log contents.
SELECT n.name FROM (SELECT DISTINCT name FROM world_shards) n
WHERE instr((SELECT group_concat(text,'') FROM
 (SELECT text FROM world_shards WHERE name=n.name ORDER BY seq)),'453a0f63-5b90-4e7b-b730-4ea9ff54b70d')>0;
-- Exact relevant-part guard; NUL separators match the source storage contract.
SELECT count(*) AS relevant_parts FROM collection_parts p
WHERE p.name IN ('social','civic','root:social','root:civic')
 OR EXISTS(SELECT 1 FROM entries e WHERE (e.key='453a0f63-5b90-4e7b-b730-4ea9ff54b70d' OR instr(e.value,'453a0f63-5b90-4e7b-b730-4ea9ff54b70d')>0)
 AND p.name='entry:'||e.coll||char(0)||e.map||char(0)||e.key);
