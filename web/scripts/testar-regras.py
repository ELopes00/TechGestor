"""Testa web/firestore.rules na API de testes do Firebase Rules (não publica nada).

Uso (na pasta web/, com o Firebase CLI logado):
    firebase projects:list   # renova o token de acesso, se precisar
    python scripts/testar-regras.py
"""
import json
import os
import ssl
import urllib.request

REGRAS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "firestore.rules")
TOKEN = json.load(open(os.path.expanduser("~/.config/configstore/firebase-tools.json")))["tokens"]["access_token"]
D = "/databases/(default)/documents"

PERFIS = {
    "adm": {"perfil": "ADM", "login": "admin1"},
    "tec": {"perfil": "TECNICO", "login": "tec1"},
}


def mocks(uid):
    """get()/exists() do cadastro do usuário que faz a requisição."""
    caminho = f"{D}/usuarios/{uid}"
    if uid in PERFIS:
        return [
            {"function": "exists", "args": [{"exactValue": caminho}], "result": {"value": True}},
            {"function": "get", "args": [{"exactValue": caminho}], "result": {"value": {"data": PERFIS[uid]}}},
        ]
    return [
        {"function": "exists", "args": [{"exactValue": caminho}], "result": {"value": False}},
        {"function": "get", "args": [{"exactValue": caminho}], "result": {"undefined": {}}},
    ]


def caso(nome, esperado, uid, metodo, caminho, existente=None, novo=None):
    req = {"method": metodo, "path": f"{D}/{caminho}"}
    if uid:
        req["auth"] = {"uid": uid}
    if novo is not None:
        req["resource"] = {"data": novo}
    c = {"expectation": esperado, "request": req, "functionMocks": mocks(uid) if uid else []}
    if existente is not None:
        c["resource"] = {"data": existente}
    return nome, c


tec_doc = {"perfil": "TECNICO", "login": "tec1", "status": "ONLINE"}
CASOS = [
    caso("sem login lê inventário", "DENY", None, "get", "inventario/i1", {"x": 1}),
    caso("sem login lê chamados", "DENY", None, "list", "chamados/c1", {"x": 1}),
    caso("conta sem cadastro lê chamados", "DENY", "orfa", "get", "chamados/c1", {"x": 1}),
    caso("conta sem cadastro cria o próprio perfil ADM", "DENY", "orfa", "create", "usuarios/orfa", None, {"perfil": "ADM", "login": "x"}),
    caso("técnico lê chamados", "ALLOW", "tec", "get", "chamados/c1", {"x": 1}),
    caso("técnico cria chamado", "ALLOW", "tec", "create", "chamados/c9", None, {"titulo": "t"}),
    caso("técnico atualiza chamado", "ALLOW", "tec", "update", "chamados/c1", {"status": "a"}, {"status": "b"}),
    caso("técnico apaga chamado", "DENY", "tec", "delete", "chamados/c1", {"x": 1}),
    caso("ADM apaga chamado", "ALLOW", "adm", "delete", "chamados/c1", {"x": 1}),
    caso("técnico muda o próprio status", "ALLOW", "tec", "update", "usuarios/tec", tec_doc, {**tec_doc, "status": "ALMOCO"}),
    caso("técnico salva o próprio push token", "ALLOW", "tec", "update", "usuarios/tec", tec_doc, {**tec_doc, "expoPushToken": "x"}),
    caso("técnico se promove a ADM", "DENY", "tec", "update", "usuarios/tec", tec_doc, {**tec_doc, "perfil": "ADM"}),
    caso("técnico muda status de outro", "DENY", "tec", "update", "usuarios/outro", tec_doc, {**tec_doc, "status": "OFFLINE"}),
    caso("técnico cria usuário", "DENY", "tec", "create", "usuarios/novo", None, {"perfil": "TECNICO", "login": "n"}),
    caso("ADM cria usuário", "ALLOW", "adm", "create", "usuarios/novo", None, {"perfil": "TECNICO", "login": "n"}),
    caso("ADM edita perfil de outro", "ALLOW", "adm", "update", "usuarios/outro", tec_doc, {**tec_doc, "perfil": "ADM"}),
    caso("ADM exclui usuário", "ALLOW", "adm", "delete", "usuarios/outro", tec_doc),
    caso("técnico lê lista de usuários", "ALLOW", "tec", "get", "usuarios/outro", tec_doc),
    caso("técnico cria item de inventário", "ALLOW", "tec", "create", "inventario/i9", None, {"nome": "n"}),
    caso("técnico apaga item de inventário", "DENY", "tec", "delete", "inventario/i1", {"nome": "n"}),
    caso("técnico grava prontuário", "ALLOW", "tec", "create", "inventario/i1/prontuario/p1", None, {"acao": "a"}),
    caso("ADM limpa prontuário", "ALLOW", "adm", "delete", "inventario/i1/prontuario/p1", {"acao": "a"}),
    caso("técnico conclui agendamento (apaga)", "ALLOW", "tec", "delete", "agendamentos/a1", {"servico": "s"}),
    caso("técnico apaga evento", "DENY", "tec", "delete", "eventos/e1", {"nome": "n"}),
    caso("técnico grava log", "ALLOW", "tec", "create", "logs/l1", None, {"mensagem": "m", "usuario": "tec1", "data": 1}),
    caso("log com campo extra", "DENY", "tec", "create", "logs/l1", None, {"mensagem": "m", "usuario": "tec1", "data": 1, "x": 1}),
    caso("técnico lê o próprio log", "ALLOW", "tec", "get", "logs/l1", {"mensagem": "m", "usuario": "tec1", "data": 1}),
    caso("técnico lê log de outro", "DENY", "tec", "get", "logs/l2", {"mensagem": "m", "usuario": "outro", "data": 1}),
    caso("ADM lê qualquer log", "ALLOW", "adm", "get", "logs/l2", {"mensagem": "m", "usuario": "outro", "data": 1}),
    caso("ADM altera log", "DENY", "adm", "update", "logs/l2", {"mensagem": "m", "usuario": "o", "data": 1}, {"mensagem": "x", "usuario": "o", "data": 1}),
    caso("ADM apaga log", "DENY", "adm", "delete", "logs/l2", {"mensagem": "m", "usuario": "o", "data": 1}),
    caso("coleção desconhecida", "DENY", "adm", "get", "outra/x", {"a": 1}),
]

corpo = {
    "source": {"files": [{"name": "firestore.rules", "content": open(REGRAS, encoding="utf8").read()}]},
    "testSuite": {"testCases": [c for _, c in CASOS]},
}
req = urllib.request.Request(
    "https://firebaserules.googleapis.com/v1/projects/techgestor-bd:test",
    data=json.dumps(corpo).encode(),
    headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"},
)
try:
    res = json.load(urllib.request.urlopen(req, context=ssl.create_default_context()))
except urllib.error.HTTPError as e:
    print(e.read().decode()[:2000])
    raise SystemExit(1)

for issue in res.get("issues", []):
    print("ISSUE:", issue)
falhas = 0
for (nome, c), r in zip(CASOS, res.get("testResults", [])):
    ok = r.get("state") == "SUCCESS"
    falhas += not ok
    print(("OK   " if ok else "FALHA"), f"{c['expectation']:5}", nome, "" if ok else json.dumps(r)[:400])
print(f"\n{len(CASOS) - falhas}/{len(CASOS)} casos passaram")
