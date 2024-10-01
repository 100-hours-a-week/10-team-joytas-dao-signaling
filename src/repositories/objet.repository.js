const redisCli = require('../common/modules/redis');

class ObjetRepository {
    async getUsersInObjet(objetKey) {
        return await redisCli.lRange(objetKey, 0, -1);
    }

    async addUserToObjet(objetKey, user) {
        return await redisCli.rPush(objetKey, JSON.stringify(user));
    }

    async setSocketToObjet(socketKey, objet_id) {
        return await redisCli.set(socketKey, String(objet_id));
    }

    async getObjetBySocket(socketKey) {
        return await redisCli.get(socketKey);
    }

    async deleteSocket(socketKey) {
        return await redisCli.del(socketKey);
    }

    async deleteObjet(objetKey) {
        return await redisCli.del(objetKey);
    }

    async updateUsersInObjet(objetKey, usersInObjet) {
        await redisCli.del(objetKey);
        for (const user of usersInObjet) {
            await redisCli.rPush(objetKey, user);
        }
    }
}

module.exports = new ObjetRepository();
