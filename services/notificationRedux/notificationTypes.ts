export interface Receiver {
    userId: string;
    isRead: boolean;
}

export interface ItemNoti {
    _id: string;
    title: string;
    body: string;
    data: any;
    createdAt: string;
    isRead: boolean;
    sender: {
        _id: string;
        username: string;
        handleName: string;
        profilePic: string;
    };
}

export interface ResNoti {
    success: boolean;
    data: ItemNoti[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}